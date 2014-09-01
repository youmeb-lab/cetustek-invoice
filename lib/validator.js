'use strict';

var map = {
  string: isString,
  number: isNumber
};

module.exports = function (data) {
  return new Validator(data);
};

function Validator(data) {
  this.data = data;
}

Validator.prototype.validate = function (field, types, length) {
  if (!this.data.hasOwnProperty(field)) {
    return;
  }

  var value = this.data[field];
  var i = types.length;
  
  while (i >= 0) {
    i--;
    if (i < 0 || map[types[i]](value)) {
      break;
    }
  }

  if (i < 0) {
    throw new Error(field + ' 必須是 ' + types.join(' 或 '));
  }

  if (('' + value).length > length) {
    throw new Error(field + ' 長度過長');
  }
};

Validator.prototype.required = function (field, types, length) {
  if (!this.data.hasOwnProperty(field)) {
    throw new Error(field + ' 欄位必填');
  }
  this.validate(field, types, length);
};

function isString(str) {
  return typeof str === 'string';
}

function isNumber(num) {
  return typeof num === 'number';
}
