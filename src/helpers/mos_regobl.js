import { uniqArrByKey, filterDataByKey, toNumber, average } from './helpers';

const config = {
  levelOne: 'UDGO',
  levelTwo: 'BG',
  levelThree: 'TP'
};

export const calculateData = data => {
  return calculateRooByUdgoAndCities(data);
};

export const uniqData = data => {
  let { levelOne, levelThree } = config;
  let result = [];
  let uniqUdgos = uniqArrByKey(data, levelOne);
  let uniqCities = uniqArrByKey(data, levelThree);
  uniqUdgos.forEach(udgo => {
    uniqCities.forEach(city => {
      let uniqCity = data
        .filter(item => item[levelOne] === udgo)
        .find(item => item[levelThree] === city);
      if (uniqCity) {
        result.push(uniqCity);
      }
    });
  });
  return result;
};

export const calculateRooByUdgoAndCities = data => {
  let { levelOne, levelTwo, levelThree } = config;
  let levelTwo_FAKT = 0;
  let levelTwo_PLAN = 0;

  let uniqUdgos = uniqArrByKey(data, levelOne);

  uniqUdgos.forEach(udgo => {
    let levelOne_FAKT = 0;
    let levelOne_PLAN = 0;
    let levelOne_PRC = 0;
    let udgosData = filterDataByKey(data, levelOne, udgo);
    let uniqRoos = uniqArrByKey(udgosData, levelTwo);
    uniqRoos.forEach(roo => {
      let roosData = filterDataByKey(udgosData, levelTwo, roo);
      let uniqLevelThree = uniqArrByKey(roosData, levelThree);
      let levelThreeData = [];
      uniqLevelThree.forEach(point => {
        levelThreeData.push(roosData.find(item => item[levelThree] === point));
      });
      // BG_CUSTOMER = average(
      //   levelThreeData.map(item => toNumber(item[`${levelThree}_CUSTOMER`]))
      // );

      levelTwo_FAKT = average(
        levelThreeData.map(item => toNumber(item[`${levelThree}_FAKT`]))
      );
      levelTwo_PLAN = average(
        levelThreeData.map(item => toNumber(item[`${levelThree}_PLAN`]))
      );

      levelOne_FAKT += levelTwo_FAKT;
      levelOne_PLAN += levelTwo_PLAN;
      roosData.forEach(i => {
        i[`${levelTwo}_FAKT`] = levelTwo_FAKT;
        i[`${levelTwo}_PLAN`] = levelTwo_PLAN;
      });
    });
    if (levelOne_FAKT === 0 && levelOne_PLAN === 0) {
      levelOne_PRC = 0;
    } else if (levelOne_FAKT !== 0 && levelOne_PLAN === 0) {
      levelOne_PRC = 100;
    } else {
      levelOne_PRC = Math.round((levelOne_FAKT / levelOne_PLAN) * 100);
    }
    udgosData.forEach(el => {
      el[`${levelOne}_FAKT`] = levelOne_FAKT.toLocaleString();
      el[`${levelOne}_PLAN`] = levelOne_PLAN.toLocaleString();
      el[`${levelTwo}_FAKT`] = el[`${levelTwo}_FAKT`].toLocaleString();
      el[`${levelTwo}_PLAN`] = el[`${levelTwo}_PLAN`].toLocaleString();
      el[`${levelOne}_PRC`] = levelOne_PRC;
      el[`${levelTwo}_CNT`] = uniqRoos.size;
    });
  });
  return data;
};
