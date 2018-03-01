import React from 'react';
import { PropTypes } from 'prop-types';
import { connect } from 'react-redux';
import store from './store';

import api from '@stackstorm/module-api';
import notification from '@stackstorm/module-notification';
import setTitle from '@stackstorm/module-title';

import { Link } from 'react-router-dom';
import AutoFormCheckbox from '@stackstorm/module-auto-form/modules/checkbox';
import Criteria from '@stackstorm/module-criteria';
import Button, { Toggle } from '@stackstorm/module-forms/button.component';
import Highlight from '@stackstorm/module-highlight';
import PackIcon from '@stackstorm/module-pack-icon';
import {
  PanelDetails,
  DetailsHeader,
  DetailsSwitch,
  DetailsBody,
  DetailsPanel,
  DetailsPanelHeading,
  DetailsPanelBody,
  DetailsToolbar,
  DetailsToolbarSeparator,
} from '@stackstorm/module-panel';
import AutoForm from '@stackstorm/module-auto-form';

@connect((state) => {
  const { trigger } = state;
  return { trigger };
})
export default class TriggersDetails extends React.Component {
  static propTypes = {
    handleNavigate: PropTypes.func.isRequired,

    id: PropTypes.string,
    section: PropTypes.string,
    trigger: PropTypes.object,
  }

  state = {
    editing: null,
  }

  componentDidMount() {
    const { id } = this.props;

    if (id) {
      this.fetchTrigger(id);
    }
  }

  componentWillReceiveProps(nextProps) {
    const { id } = nextProps;

    if (id && id !== this.props.id) {
      this.fetchTrigger(id);
    }
  }

  shouldComponentUpdate(nextProps) {
    if (nextProps.id !== this.props.id) {
      return false;
    }

    return true;
  }

  refresh() {
    const { id } = this.props;

    this.fetchTrigger(id);
  }

  fetchTrigger(id) {
    return store.dispatch({
      type: 'FETCH_TRIGGER',
      promise: api.client.triggerTypes.get(id),
    })
      .catch((err) => {
        notification.error(`Unable to retrieve trigger "${id}".`, { err });
        throw err;
      })
    ;
  }

  handleSection(section) {
    const { id } = this.props;
    return this.props.handleNavigate({ id, section });
  }

  handleToggleEnable() {
    const { sensor } = this.props.trigger;

    return store.dispatch({
      type: 'TOGGLE_ENABLE',
      promise: api.client.index.request({ method: 'put', path: `/sensortypes/${sensor.ref}`}, { ...sensor, enabled: !sensor.enabled }),
    })
      .catch((err) => {
        notification.error(`Unable to retrieve trigger "${id}".`, { err });
        throw err;
      })
    ;
  }

  render() {
    const { id, section, trigger, triggerSpec } = this.props;

    if (!trigger) {
      return null;
    }
    
    setTitle([ trigger.ref, 'Trigger Types' ]);

    return (
      <PanelDetails data-test="details">
        <DetailsHeader
          status={trigger.enabled ? 'enabled' : 'disabled'}
          title={( <Link to={`/triggers/${trigger.ref}`}>{trigger.ref}</Link> )}
          subtitle={trigger.description}
        />
        <DetailsSwitch
          sections={[
            { label: 'General', path: 'general' },
            { label: 'Code', path: 'code' },
          ]}
          current={section}
          onChange={({ path }) => this.handleSection(path)}
        />
        <DetailsToolbar>
          { trigger.sensor
            ? <Toggle title="enabled" value={trigger.sensor.enabled} onChange={() => this.handleToggleEnable()}/>
            : <Toggle title="no sensor" value={false} onChange={() => this.handleToggleEnable()} disabled/>
          }
          <DetailsToolbarSeparator />
        </DetailsToolbar>
        <DetailsBody>
          { section === 'general' ? (
            <form name="form">
              <DetailsPanel>
                <DetailsPanelHeading title="Parameters" />
                <DetailsPanelBody>
                  <AutoForm
                    spec={{
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string'
                        },
                        description: {
                          type: 'string'
                        }
                      }
                    }}
                    data={trigger}
                    disabled
                    data-test="parameters_form"
                    flat
                  />
                </DetailsPanelBody>
              </DetailsPanel>
            </form>
          ) : null }
          { section === 'code' ? (
            <DetailsPanel data-test="trigger_code">
              <Highlight lines={20} code={trigger} />
            </DetailsPanel>
          ) : null }
        </DetailsBody>
      </PanelDetails>
    );
  }
}
