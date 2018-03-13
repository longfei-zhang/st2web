import _ from 'lodash';
import { createScopedStore } from '@stackstorm/module-store';

import flexTableReducer from '@stackstorm/module-flex-table/flex-table.reducer';

const triggerReducer = (state = {}, input) => {
  let {
    triggers = [],
    groups = null,
    filter = '',
    trigger = undefined,
  } = state;

  state = {
    ...state,
    triggers,
    groups,
    filter,
    trigger,
  };

  switch (input.type) {
    case 'FETCH_GROUPS': {
      switch(input.status) {
        case 'success':
          triggers = input.payload;
          groups = makeGroups(triggers, filter);
          break;
        case 'error':
          break;
        default:
          break;
      }

      return {
        ...state,
        triggers,
        groups,
        trigger,
      };
    }

    case 'FETCH_TRIGGER': {
      switch(input.status) {
        case 'success':
          trigger = {
            ...triggers.find(item => item.ref === input.payload.ref),
            ...input.payload,
          };
          break;
        case 'error':
          break;
        default:
          break;
      }

      return {
        ...state,
        trigger,
      };
    }

    case 'TOGGLE_ENABLE': {
      switch(input.status) {
        case 'success':
          // triggers.find(item => item.ref === input.payload.ref)
          trigger = {
            ...trigger,
            sensor: input.payload,
          };
          break;
        case 'error':
          break;
        default:
          break;
      }

      return {
        ...state,
        trigger,
      };
    }

    case 'SET_FILTER': {
      filter = input.filter;
      groups = makeGroups(triggers, filter);

      return {
        ...state,
        groups,
        filter,
      };
    }

    default:
      return state;
  }
};

const reducer = (state = {}, action) => {
  state = flexTableReducer(state, action);
  state = triggerReducer(state, action);

  return state;
};

const store = createScopedStore('triggers', reducer);

export default store;

function makeGroups(triggers, filter) {
  const groups = _(triggers)
    .filter(({ ref }) => ref.toLowerCase().indexOf(filter.toLowerCase()) > -1)
    .sortBy('ref')
    .groupBy('pack')
    .value()
  ;

  return Object.keys(groups).map((pack) => ({ pack, triggers: groups[pack] }));
}
