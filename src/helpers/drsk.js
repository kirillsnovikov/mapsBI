import { uniqArrByKey, filterDataByKey, toNumber, average } from './helpers';

const config = {
  levelOne: 'UDGO',
  levelTwo: 'ROO',
  levelThree: 'CITY'
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
  let levelThree_FAKT = 0;
  let levelThree_PLAN = 0;
  let totalCities = {};

  let uniqUdgos = uniqArrByKey(data, levelOne);

  let uniqCities = uniqArrByKey(data, levelThree);

  uniqCities.forEach(uniqCity => {
    let filterCities = [];
    uniqUdgos.forEach(uniqUdgo => {
      let city = data.find(
        item => item.CITY === uniqCity && item.UDGO === uniqUdgo
      );
      if (city) {
        filterCities.push(city);
      }
    });
    totalCities[uniqCity] = {
      FAKT: average(
        filterCities.map(city => toNumber(city[`${levelThree}_FAKT`]))
      ),
      PLAN: average(
        filterCities.map(city => toNumber(city[`${levelThree}_PLAN`]))
      )
    };
  });

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

      levelTwo_FAKT = average(
        levelThreeData.map(item => toNumber(item[`${levelThree}_FAKT`]))
      );
      levelTwo_PLAN = average(
        levelThreeData.map(item => toNumber(item[`${levelThree}_PLAN`]))
      );
      levelOne_FAKT += levelTwo_FAKT;
      levelOne_PLAN += levelTwo_PLAN;
      roosData.forEach(i => {
        i[`UDGO_${levelTwo}_FAKT`] = levelTwo_FAKT;
        i[`UDGO_${levelTwo}_PLAN`] = levelTwo_PLAN;
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
      el[`UDGO_${levelOne}_FAKT`] = levelOne_FAKT.toLocaleString();
      el[`UDGO_${levelOne}_PLAN`] = levelOne_PLAN.toLocaleString();
      el[`UDGO_${levelTwo}_FAKT`] = el[
        `UDGO_${levelTwo}_FAKT`
      ].toLocaleString();
      el[`UDGO_${levelTwo}_PLAN`] = el[
        `UDGO_${levelTwo}_PLAN`
      ].toLocaleString();
      el[`UDGO_${levelOne}_PRC`] = levelOne_PRC;
      el[`UDGO_${levelTwo}_CNT`] = uniqRoos.size;
      el[`${levelThree}_TOTAL_FAKT`] = totalCities[
        el.CITY
      ].FAKT.toLocaleString();
      el[`${levelThree}_TOTAL_PLAN`] = totalCities[
        el.CITY
      ].PLAN.toLocaleString();
    });
  });
  return data;
};

// export const rooOnlyMinus = (data, roo) => {
//   console.log(uniqArrByKey(filterDataByKey(data, 'ROO', roo), 'UDGO'), roo);
//   return false;
// };
