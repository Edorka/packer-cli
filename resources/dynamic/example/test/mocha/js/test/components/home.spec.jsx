import React from 'react';

import { expect } from 'chai';
import { shallow } from 'enzyme';

import Home from '../../src/components/home';

describe('<Home/> component test suite', () => {
  it('should contain github forkme logo', () => {
    const wrapper = shallow(<Home />);
    expect(wrapper.find('.fork-me-logo')).to.be.present();
  });
});
