import { uniqArrByKey, filterDataByKey, toNumber, average } from './helpers';

const config = {
  UDGO: 'UDGO',
  ROO: 'ROO',
  CITY: 'CITY'
};

export const calculateData = data => {
  return calculateRooByUdgoAndCities(uniqData(data));
};

export const uniqData = data => {
  let { UDGO, CITY } = config;
  let result = [];
  let uniqUdgos = uniqArrByKey(data, UDGO);
  let uniqCities = uniqArrByKey(data, CITY);
  uniqUdgos.forEach(udgo => {
    uniqCities.forEach(city => {
      let uniqCity = data
        .filter(item => item[UDGO] === udgo)
        .find(item => item[CITY] === city);
      if (uniqCity) {
        result.push(uniqCity);
      }
    });
  });
  return result;
};

export const calculateRooByUdgoAndCities = data => {
  let { UDGO, ROO, CITY } = config;
  let ROO_CUSTOMER = 0;

  let uniqUdgos = uniqArrByKey(data, UDGO);

  uniqUdgos.forEach(udgo => {
    let UDGO_CUSTOMER = 0;
    let udgosData = filterDataByKey(data, UDGO, udgo);
    let uniqRoos = uniqArrByKey(udgosData, ROO);
    uniqRoos.forEach(roo => {
      let roosData = filterDataByKey(udgosData, ROO, roo);
      let uniqPoints = uniqArrByKey(roosData, CITY);
      let pointsData = [];
      uniqPoints.forEach(point => {
        pointsData.push(roosData.find(item => item[CITY] === point));
      });
      ROO_CUSTOMER = average(
        pointsData.map(item => toNumber(item[`${CITY}_CUSTOMER`]))
      );
      UDGO_CUSTOMER += ROO_CUSTOMER;
      roosData.forEach(i => {
        i[`${ROO}_CUSTOMER`] = ROO_CUSTOMER;
        i[`${CITY}_CNT`] = uniqPoints.size;
      });
    });
    udgosData.forEach(el => {
      el[`${UDGO}_CUSTOMER`] = UDGO_CUSTOMER.toLocaleString();
      el[`${ROO}_CUSTOMER`] = el[`${ROO}_CUSTOMER`].toLocaleString();
      el[`${ROO}_CNT`] = uniqRoos.size;
    });
  });
  return data;
};
