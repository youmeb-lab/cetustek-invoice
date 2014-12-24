'use strict';

var soap = require('soap');
var moment = require('moment');
var data2xml = require('data2xml')();

var defaultEndpint = 'http://www.ei.com.tw/InvoiceB2C/InvoiceAPI?wsdl';

var AUTH = Symbol('auth');
var CLIENT = Symbol('client');
var RENTID = Symbol('rentid');
var ENDPOINT = Symbol('endpoint');

module.exports = Invoice;

var requiredFields = {};

function Invoice(options) {
  options || (options = {});

  if (!options.user) {
    throw new Error('是不會設定 .user 名稱嗎?...');
  }

  if (!options.password) {
    throw new Error('是不會設定 .password 嗎?...');
  }

  this[RENTID] = options.rentid;
  this[ENDPOINT] = options.endpoint || defaultEndpint;
  this[AUTH] = soap.BasicAuthSecurity(options.user, options.password);
}

// lazy create
Invoice.prototype.getClient = function () {
  return new Promise(function (resolve, reject) {
    if (this[CLIENT]) {
      return resolve(this[CLIENT]);
    }
    soap.createClient(this[ENDPOINT], function (err, client) {
      if (err) {
        return reject(err);
      }
      resolve(client);
    }.bind(this));
  }.bind(this));
};

// v3 1.1
Invoice.prototype.create = function (data, items, hastax) {
  return new Promise(function (resolve, reject) {
    // 不需要在外部考慮日期格式
    if (data.OrderDate) {
      data.OrderDate = moment(new Date(data.OrderDate))
        .format('YYYY/MM/DD');
    }

    items = (items || []).map(function (item) {
      return { ProductItem: item };
    });

    // 設定明細資料
    data.Details = items;

    // 載具
    // 規格在 1.1 table 1

    // 手機的 CarrierId2 跟 CarrierId1 相同
    if (data.CarrierType === '3J0002') {
      data.CarrierId2 = data.CarrierId1;
    }

    // CarrierType 不存在 CarrierId1, CarrierId2 也都不會存在
    if (!data.CarrierType) {
      delete data.CarrierId1;
      delete data.CarrierId2;
    }

    var xml = data2xml('Invoice', data);  

    // 送出發票資料
    var sendData = (function (client) {
      return new Promise(function (resolve, reject) {
        client.InvoiceAPIService.InvoiceAPIPort.CreateInvoiceV3({
          invoicexml: xml,
          rentid: this[RENTID],
          hastax: hastax ? '1' : '0'
        }, function (err, result) {
          if (err) {
            return reject(err);
          }

          var ret = result.return[0];
          
          // 錯誤訊息格式
          // 1.1 table 5
          err = emptyOrFormatError(ret)
            || xmlFormatError(ret)
            || noDetail(ret)
            || productNumberFormatError(ret)
            || noProductNameOrFormatError(ret)
            || noQuantityOrFormatError(ret)
            || noUnitPriceOrFormatError(ret)
            || unitError(ret)
            || databaseError(ret)
            || strangeDateError(ret)
            || dateRangeError(ret)
            || canNotGetInvoiceNumber(ret)
            || noInvoiceNumber(ret)
            || outOfLimit(ret)
            || alreadyExists(ret)
            || ipBlocked(ret)

          if (err) {
            err.code = ret;
            return reject(err);
          }

          if (ret.length !== 10) {
            err = new Error(ret + ' 不是發票號碼，未知錯誤');
            err.code = 'UNKNOWN';
            return reject(err);
          }

          resolve(ret);
        });
      }.bind(this));
    }).bind(this);

    this.getClient()
      .then(sendData)
      .then(resolve)
      .catch(reject)
  }.bind(this));
};

function emptyOrFormatError(val) {
  var match = val.match(/^M:(.+)/);

  if (match) {
    return new Error('欄位 \'' + match[1] + '\' 未填');
  }
}

function xmlFormatError(val) {
  if (/^M[01]$/.test(val)) {
    return new Error('XML 格式錯誤');
  }
}

function noDetail(val) {
  if (val === 'D0') {
    return new Error('沒有產品明細');
  }
}

function productNumberFormatError(ret) {
  var match = ret.match(/^D0_(\d+)/);

  if (match) {
    return new Error('第 ' + match[1] + ' 筆產品資料編號未填或格式錯誤');
  }
}

function noProductNameOrFormatError(ret) {
  var match = ret.match(/^D1_(\d+)/);

  if (match) {
    return new Error('第 ' + match[1] + ' 筆產品資料名稱未填或格式錯誤');
  }
}

function noQuantityOrFormatError(ret) {
  var match = ret.match(/^D2_(\d+)/);

  if (match) {
    return new Error('第 ' + match[1] + ' 筆產品資料數量未填或格式錯誤');
  }
}

function noUnitPriceOrFormatError(ret) {
  var match = ret.match(/^D3_(\d+)/);

  if (match) {
    return new Error('第 ' + match[1] + ' 筆產品資料單價未填或格式錯誤');
  }
}

function unitError(ret) {
  var match = ret.match(/^D4_(\d+)/);

  if (match) {
    return new Error('第 ' + match[1] + ' 筆產品資料單位格式錯誤');
  }
}

function databaseError(ret) {
  if (ret === 'S1') {
    return new Error('資料庫發生錯誤');
  }
}

function strangeDateError(ret) {
  if (ret === 'S2') {
    return new Error('訂單日期超過開立日期');
  }
}

function dateRangeError(ret) {
  if (ret === 'S3') {
    return new Error('未在申報期內');
  }
}

function canNotGetInvoiceNumber(ret) {
  if (ret === 'S4') {
    return new Error('未取得發票號碼');
  }
}

function noInvoiceNumber(ret) {
  if (ret === 'S5') {
    return new Error('發票號碼已使用完畢');
  }
}

function outOfLimit(ret) {
  if (ret === 'S6') {
    return new Error('超過租賃張數限制');
  }
}

function alreadyExists(ret) {
  if (ret === 'S7') {
    return new Error('這筆訂單已經開過發票');
  }
}

function ipBlocked(ret) {
  if (/^InValid$/i.test(ret)) {
    return new Error('無效 IP，請通知廠商');
  }
}
