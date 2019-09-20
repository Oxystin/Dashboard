import React from 'react';
import { Modal } from 'react-bootstrap';
import configureStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import fetchMock from 'fetch-mock';
import thunk from 'redux-thunk';
import sinon from 'sinon';

import ChangeDatasourceModal from '../../../src/datasource/ChangeDatasourceModal';
import mockDatasource from '../../fixtures/mockDatasource';

const props = {
  addDangerToast: () => {},
  onDatasourceSave: sinon.spy(),
  onChange: () => {},
  onHide: () => {},
  show: true,
};

const datasource = mockDatasource['7__table'];
const datasourceData = {
  id: datasource.name,
  type: datasource.type,
  uid: datasource.id,
};

const DATASOURCES_ENDPOINT = 'glob:*/superset/datasources/';
const DATASOURCE_ENDPOINT = `glob:*/datasource/get/${datasourceData.type}/${datasourceData.id}`;
const DATASOURCES_PAYLOAD = { json: 'data' };
const DATASOURCE_PAYLOAD = { new: 'data' };

describe('ChangeDatasourceModal', () => {
  const mockStore = configureStore([thunk]);
  const store = mockStore({});
  fetchMock.get(DATASOURCES_ENDPOINT, DATASOURCES_PAYLOAD);

  let wrapper;
  let el;
  let inst;

  beforeEach(() => {
    el = <ChangeDatasourceModal {...props} />;
    wrapper = shallow(el, { context: { store } }).dive();
    inst = wrapper.instance();
  });

  it('is valid', () => {
    expect(React.isValidElement(el)).toBe(true);
  });

  it('renders a Modal', () => {
    expect(wrapper.find(Modal)).toHaveLength(1);
  });

  it('fetches datasources', (done) => {
    inst.onEnterModal();
    setTimeout(() => {
      expect(fetchMock.calls(DATASOURCES_ENDPOINT)).toHaveLength(1);
      fetchMock.reset();
      done();
    }, 0);
  });

  it('changes the datasource', (done) => {
    fetchMock.get(DATASOURCE_ENDPOINT, DATASOURCE_PAYLOAD);
    inst.selectDatasource(datasourceData);
    setTimeout(() => {
      expect(fetchMock.calls(DATASOURCE_ENDPOINT)).toHaveLength(1);
      expect(props.onDatasourceSave.getCall(0).args[0]).toEqual(DATASOURCE_PAYLOAD);
      fetchMock.reset();
      done();
    }, 0);
  });
});