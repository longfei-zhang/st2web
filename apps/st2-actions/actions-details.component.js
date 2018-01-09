import React from 'react';
import { PropTypes } from 'prop-types';
import { connect } from 'react-redux';
import store from './store';

import cx from 'classnames';
import api from '@stackstorm/module-api';
import {
  actions as flexActions,
} from '@stackstorm/module-flex-table/flex-table.reducer';
import notification from '@stackstorm/module-notification';
import setTitle from '@stackstorm/module-title';

import { Link } from 'react-router-dom';
import ActionReporter from '@stackstorm/module-action-reporter';
import AutoForm from '@stackstorm/module-auto-form';
import StringField from '@stackstorm/module-auto-form/fields/string';
import {
  FlexTable,
  FlexTableRow,
  FlexTableInsert,
} from '@stackstorm/module-flex-table';
import FlowLink from '@stackstorm/module-flow-link';
import Button from '@stackstorm/module-forms/button.component';
import Highlight from '@stackstorm/module-highlight';
import Label from '@stackstorm/module-label';
import {
  PanelDetails,
  DetailsHeader,
  DetailsSwitch,
  DetailsBody,
  DetailsPanel,
  DetailsPanelEmpty,
  DetailsPanelHeading,
  DetailsPanelBody,
  DetailsButtonsPanel,
  DetailsToolbar,
  DetailsToolbarSeparator,
} from '@stackstorm/module-panel';
import Time from '@stackstorm/module-time';

@connect((state) => {
  const { action, executions } = state;
  return { action, executions };
})
export default class ActionsDetails extends React.Component {
  static propTypes = {
    handleNavigate: PropTypes.func.isRequired,
    handleRun: PropTypes.func.isRequired,
    provideRefresh: PropTypes.func.isRequired,

    id: PropTypes.string,
    section: PropTypes.string,
    action: PropTypes.object,
    executions: PropTypes.array,
  }

  state = {
    runPreview: false,
    runValue: null,
    runTrace: null,
    executionsVisible: {},
  }

  componentDidMount() {
    api.client.stream.listen().then((source) => {
      this._source = source;

      this._streamListener = (e) => {
        const record = JSON.parse(e.data);

        if (record.action.id !== this.props.action.id) {
          return;
        }

        store.dispatch({
          type: 'UPDATE_EXECUTION',
          event: e.type,
          record,
        });
      };

      this._source.addEventListener('st2.execution__create', this._streamListener);
      this._source.addEventListener('st2.execution__update', this._streamListener);
      this._source.addEventListener('st2.execution__delete', this._streamListener);
    });

    const { id, provideRefresh } = this.props;

    if (provideRefresh) {
      provideRefresh(() => this.refresh());
    }

    if (id) {
      this.fetchAction(id);
    }
  }

  componentWillReceiveProps(nextProps) {
    const { id } = nextProps;

    if (id && id !== this.props.id) {
      this.fetchAction(id);
    }
  }

  shouldComponentUpdate(nextProps) {
    if (nextProps.id !== this.props.id) {
      return false;
    }

    return true;
  }

  componentWillUnmount() {
    this._source.removeEventListener('st2.execution__create', this._streamListener);
    this._source.removeEventListener('st2.execution__update', this._streamListener);
    this._source.removeEventListener('st2.execution__delete', this._streamListener);
  }

  refresh() {
    const { id } = this.props;

    this.fetchAction(id);
  }

  fetchAction(id) {
    store.dispatch({
      type: 'FETCH_ACTION',
      promise: api.client.actionOverview.get(id),
    })
      .then(() => {
        this.setState({ runValue: {}, runTrace: '' });

        const { action } = this.props;
        store.dispatch(flexActions.toggle(action.pack, false));
      })
      .catch((err) => {
        notification.error(`Unable to retrieve action "${id}".`, { err });
        throw err;
      })
    ;

    store.dispatch({
      type: 'FETCH_EXECUTIONS',
      promise: api.client.executions.list({
        action: id,
      }),
    })
      .catch((err) => {
        notification.error(`Unable to retrieve history for action "${id}".`, { err });
        throw err;
      })
    ;
  }

  handleSection(section) {
    const { id } = this.props;
    return this.props.handleNavigate({ id, section });
  }

  handleToggleRunPreview() {
    let { runPreview } = this.state;

    runPreview = !runPreview;

    this.setState({ runPreview });
  }

  handleToggleExecution(id) {
    this.setState({
      executionsVisible: {
        ...this.state.executionsVisible,
        [id]: !this.state.executionsVisible[id],
      },
    });
  }

  handleRun(e, ...args) {
    e.preventDefault();

    return this.props.handleRun(...args);
  }

  render() {
    const { section, action, executions } = this.props;

    if (!action) {
      return null;
    }

    setTitle([ action.ref, 'Actions' ]);

    return (
      <PanelDetails data-test="details">
        <DetailsHeader
          title={( <Link to={`/actions/${action.ref}`}>{action.ref}</Link> )}
          subtitle={action.description}
        />
        <DetailsSwitch
          sections={[
            { label: 'General', path: 'general' },
            { label: 'Code', path: 'code' },
          ]}
          current={section}
          onChange={({ path }) => this.handleSection(path)}
        />
        <DetailsBody>
          { section === 'general' ? (
            <div>
              <DetailsPanel data-test="action_parameters">
                <DetailsPanelHeading title="Parameters" />
                <DetailsPanelBody>
                  <form onSubmit={(e) => this.handleRun(e, action.ref, this.state.runValue, this.state.runTrace || undefined)}>
                    <AutoForm
                      spec={{
                        type: 'object',
                        properties: action.parameters,
                      }}
                      data={this.state.runValue}
                      onChange={(runValue) => this.setState({ runValue })}
                    />
                    <StringField
                      name="trace-tag"
                      spec={{}}
                      value={this.state.runTrace}
                      onChange={(runTrace) => this.setState({ runTrace })}
                    />

                    <DetailsButtonsPanel>
                      <Button flat value="Preview" onClick={() => this.handleToggleRunPreview()} />
                      <Button submit value="Run" data-test="run_submit" />
                    </DetailsButtonsPanel>
                    { this.state.runPreview ? (
                      <Highlight data-test="action_code" code={this.state.runValue} />
                    ) : null }
                  </form>
                </DetailsPanelBody>
              </DetailsPanel>
              <DetailsPanel data-test="action_executions">
                <DetailsPanelHeading title="Executions" />
                <DetailsPanelBody>
                  { executions.length > 0 ? (
                    <FlexTable>
                      { executions.map((execution) => [
                        <FlexTableRow
                          key={execution.id}
                          onClick={() => this.handleToggleExecution(execution.id)}
                          columns={[
                            {
                              className: 'st2-actions__details-column-utility',
                              children: (
                                <i
                                  className={cx({
                                    'icon-chevron-down': this.state.executionsVisible[execution.id],
                                    'icon-chevron_right': !this.state.executionsVisible[execution.id],
                                  })}
                                />
                              ),
                            },
                            {
                              className: 'st2-actions__details-column-meta',
                              children: <Label status={execution.status} short={true} />,
                            },
                            {
                              className: 'st2-actions__details-column-time',
                              children: <Time timestamp={execution.start_timestamp} />,
                            },
                            {
                              Component: Link,
                              to: `/history/${execution.id}/general?action=${action.ref}`,
                              className: 'st2-actions__details-column-history',
                              title: 'Jump to History',
                              children: <i className="icon-history" />,
                            },
                          ]}
                        />,
                        <FlexTableInsert key={`${execution.id}-insert`} visible={this.state.executionsVisible[execution.id] || false}>
                          <ActionReporter runner={execution.runner.name} execution={execution} />
                        </FlexTableInsert>,
                      ]) }
                    </FlexTable>
                  ) : (
                    <DetailsPanelEmpty>No history records for this action</DetailsPanelEmpty>
                  ) }

                  <Link className="st2-forms__button st2-forms__button--flat" to={`/history?action=${action.ref}`}>
                    <i className="icon-history" /> See full action history
                  </Link>
                </DetailsPanelBody>
              </DetailsPanel>
            </div>
          ) : null }
          { section === 'code' ? (
            <DetailsPanel data-test="action_code">
              <Highlight lines={20} code={action} />
            </DetailsPanel>
          ) : null }
        </DetailsBody>
        <DetailsToolbar>
          { action.runner_type === 'mistral-v2' ? (
            <FlowLink action={action.ref} data-test="flow_link" />
          ) : null }

          <DetailsToolbarSeparator />
        </DetailsToolbar>
      </PanelDetails>
    );
  }
}
