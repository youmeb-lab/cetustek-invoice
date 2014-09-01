'use strict';

var Invoice = require('./');

var invoice = new Invoice({
  user: 'xxx',
  password: 'xxx'
});

invoice
  .create({
    OrderId: 'A44556632',
    OrderDate: '2011/09/13',
    BuyerIdentifier: '53118823',
    BuyerName: '測試',
    BuyerAddress: 'OOXX 的地址',
    BuyerPersonInCharge: '死肥周',
    BuyerTelephoneNumber: '0800797899',
    BuyerFacsimileNumber: '02-26511024',
    BuyerEmailAddress: 'test@fakeinbox.com',
    BuyerCustomerNumber: 'VIG01AA39090',
    DonateMark: 0,
    InvoiceType: '05',
    NPOBAN: '',
    PayWay: 2,
    TaxType: 1,
    TaxRate: 0.05,
    Remark: ''
  }, [
    {
      ProductionCode: 'AAA123',
      Description: 'OOXX',
      Quantity: 17,
      Unit: '月',
      UnitPrice: 50000
    }
  ])
  .then(function (num) {
    console.log(num);
  })
  .catch(function (e) {
    console.log(e.stack || e.message);
  });
