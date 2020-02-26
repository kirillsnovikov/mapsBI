import { uniqArrByKey, filterDataByKey, toNumber, average } from './helpers';

const config = {
  UDGO: 'UDGO',
  BG: 'BG',
  TP: 'TP'
};

export const calculateData = data => {
  return calculateRooByUdgoAndCities(data);
};

export const uniqData = data => {
  let { UDGO, TP } = config;
  let result = [];
  let uniqUdgos = uniqArrByKey(data, UDGO);
  let uniqCities = uniqArrByKey(data, TP);
  uniqUdgos.forEach(udgo => {
    uniqCities.forEach(city => {
      let uniqCity = data
        .filter(item => item[UDGO] === udgo)
        .find(item => item[TP] === city);
      if (uniqCity) {
        result.push(uniqCity);
      }
    });
  });
  return result;
};

export const calculateRooByUdgoAndCities = data => {
  let { UDGO, BG, TP } = config;
  let BG_CUSTOMER = 0;

  let uniqUdgos = uniqArrByKey(data, UDGO);

  uniqUdgos.forEach(udgo => {
    let UDGO_CUSTOMER = 0;
    let udgosData = filterDataByKey(data, UDGO, udgo);
    let uniqRoos = uniqArrByKey(udgosData, BG);
    uniqRoos.forEach(roo => {
      let roosData = filterDataByKey(udgosData, BG, roo);
      let uniqPoints = uniqArrByKey(roosData, TP);
      let pointsData = [];
      uniqPoints.forEach(point => {
        pointsData.push(roosData.find(item => item[TP] === point));
      });
      BG_CUSTOMER = average(
        pointsData.map(item => toNumber(item[`${TP}_CUSTOMER`]))
      );
      UDGO_CUSTOMER += BG_CUSTOMER;
      roosData.forEach(i => {
        i[`${BG}_CUSTOMER`] = BG_CUSTOMER;
        i[`${TP}_CNT`] = uniqPoints.size;
      });
    });
    udgosData.forEach(el => {
      el[`${UDGO}_CUSTOMER`] = UDGO_CUSTOMER;
      el[`${BG}_CUSTOMER`] = el[`${BG}_CUSTOMER`];
      el[`${BG}_CNT`] = uniqRoos.size;
    });
  });
  return data;
};
