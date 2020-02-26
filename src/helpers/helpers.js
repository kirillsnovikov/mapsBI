export const uniqArrByKey = (arr, key) => {
  return new Set(arr.map(item => item[key]));
};

export const filterDataByKey = (data, key, value) => {
  return data.filter(item => item[key] === value);
};

export const toNumber = str => {
  return Number(str.replace(/,/g, '.').replace(/\s/g, ''));
};

export const average = nums => {
  return nums.reduce((a, b) => a + b);
};
