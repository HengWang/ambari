/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var App = require('app');
var uiEffects = require('utils/ui_effects');

/**
 * Mixin for <code>App.HostComponentView</code>
 * Contains code for processing components with allowed decommission
 * @type {Em.Mixin}
 */
App.Decommissionable = Em.Mixin.create({

  /**
   * Should be redeclared in views that use this mixin
   * @type {String}
   */
  componentForCheckDecommission: '',

  /**
   * Is component in decommission process right know
   * @type {bool}
   */
  isComponentDecommissioning: null,

  /**
   * May conponent be decommissioned
   * @type {bool}
   */
  isComponentDecommissionAvailable: null,

  /**
   * May component be recommissioned
   * @type {bool}
   */
  isComponentRecommissionAvailable: null,

  /**
   * Component with stopped masters can't be docommissioned
   * @type {bool}
   */
  isComponentDecommissionDisable: function() {
    var masterComponent = this.get('content.service.hostComponents').findProperty('componentName', this.get('componentForCheckDecommission'));
    if (masterComponent && masterComponent.get('workStatus') != App.HostComponentStatus.started) return true;
    return this.get('content.service.workStatus') != App.HostComponentStatus.started;
  }.property('content.service.workStatus', 'content.service.hostComponents.@each.workStatus'),

  /**
   * @override App.HostComponentView.isRestartableComponent
   */
  isRestartableComponent: function() {
    return this.get('isComponentDecommissionAvailable') && App.get('components.restartable').contains(this.get('content.componentName'));
  }.property('isComponentDecommissionAvailable'),

  /**
   * Tooltip message shows if decommission/recommission is disabled
   * when masters for current component is down
   */
  decommissionTooltipMessage: function() {
    if (this.get('isComponentDecommissionDisable') && (this.get('isComponentRecommissionAvailable') || this.get('isComponentDecommissionAvailable'))) {
      var decom = this.get('isComponentRecommissionAvailable') ? Em.I18n.t('common.recommission') : Em.I18n.t('common.decommission');
      return Em.I18n.t('hosts.decommission.tooltip.warning').format(decom, App.format.role(this.get('componentForCheckDecommission')));
    }
  }.property('isComponentDecommissionDisable', 'isComponentRecommissionAvailable', 'isComponentDecommissionAvailable', 'componentForCheckDecommission'),
  /**
   * Recalculated component status based on decommission
   * @type {string}
   */
  statusClass: function () {

    //Class when install failed
    if (this.get('workStatus') === App.HostComponentStatus.install_failed) {
      return 'health-status-color-red icon-cog';
    }

    //Class when installing
    if (this.get('workStatus') === App.HostComponentStatus.installing) {
      return 'health-status-color-blue icon-cog';
    }

    if (this.get('isComponentRecommissionAvailable') && (this.get('isStart') || this.get('workStatus') == 'INSTALLED')) {
      return 'health-status-DEAD-ORANGE';
    }

    //For all other cases
    return 'health-status-' + App.HostComponentStatus.getKeyName(this.get('workStatus'));

  }.property('workStatus', 'isComponentRecommissionAvailable', 'isComponentDecommissioning'),

  /**
   * Return host component text status
   * @type {String}
   */
  componentTextStatus: function () {
    var componentTextStatus = this.get('content.componentTextStatus');
    var hostComponent = this.get('hostComponent');
    if (hostComponent) {
      componentTextStatus = hostComponent.get('componentTextStatus');
      if(this.get('isComponentRecommissionAvailable')){
        if(this.get('isComponentDecommissioning')){
          componentTextStatus = Em.I18n.t('hosts.host.decommissioning');
        } else {
          componentTextStatus = Em.I18n.t('hosts.host.decommissioned');
        }
      }
    }
    return componentTextStatus;
  }.property('workStatus','isComponentRecommissionAvailable','isComponentDecommissioning'),

  /**
   * For Stopping or Starting states, also for decommissioning
   * @type {bool}
   */
  isInProgress: function () {
    return (this.get('workStatus') === App.HostComponentStatus.stopping ||
      this.get('workStatus') === App.HostComponentStatus.starting) ||
      this.get('isDecommissioning');
  }.property('workStatus', 'isDecommissioning'),

  /**
   * load Recommission/Decommission status of component
   */
  loadComponentDecommissionStatus: function () {
    return this.getDesiredAdminState();
  },

  /**
   * Get desired_admin_state status from server
   */
  getDesiredAdminState: function(){
    return App.ajax.send({
      name: 'host.host_component.slave_desired_admin_state',
      sender: this,
      data: {
        hostName: this.get('content.hostName'),
        componentName: this.get('content.componentName')
      },
      success: 'getDesiredAdminStateSuccessCallback',
      error: 'getDesiredAdminStateErrorCallback'
    });
  },

  /**
   * pass received value or null to <code>setDesiredAdminState</code>
   * @param {Object} response
   * @returns {String|null}
   */
  getDesiredAdminStateSuccessCallback: function (response) {
    var status = response.HostRoles.desired_admin_state;
    if (status != null) {
      this.setDesiredAdminState(status);
      return status;
    }
    return null;
  },

  /**
   * error callback of <code>getDesiredAdminState</code>
   */
  getDesiredAdminStateErrorCallback: Em.K,

  /**
   * compute decommission state by desiredAdminState
   * @param {Object} status
   */
  setDesiredAdminState: Em.K,

  /**
   * Get component decommission status from server
   * @returns {$.ajax}
   */
  getDecommissionStatus: function() {
    return App.ajax.send({
      name: 'host.host_component.decommission_status',
      sender: this,
      data: {
        hostName: this.get('content.hostName'),
        componentName: this.get('componentForCheckDecommission'),
        serviceName: this.get('content.service.serviceName')
      },
      success: 'getDecommissionStatusSuccessCallback',
      error: 'getDecommissionStatusErrorCallback'
    });
  },

  /**
   * pass received value or null to <code>setDecommissionStatus</code>
   * @param {Object} response
   * @returns {Object|null}
   */
  getDecommissionStatusSuccessCallback: function (response) {
    var statusObject = response.ServiceComponentInfo;
    if ( statusObject != null) {
      statusObject.component_state = response.host_components[0].HostRoles.state;
      this.setDecommissionStatus(statusObject);
      return statusObject;
    }
    return null;
  },

  /**
   * Set null to <code>decommissionedStatusObject</code> if server returns error
   * @returns {null}
   */
  getDecommissionStatusErrorCallback: Em.K,

  /**
   * compute decommission state by component info
   * @param {Object} status
   */
  setDecommissionStatus: Em.K,

  /**
   * set decommission and recommission flags according to status
   * @param status
   */
  setStatusAs: function (status) {
    switch (status) {
      case "INSERVICE":
        this.set('isComponentRecommissionAvailable', false);
        this.set('isComponentDecommissioning', false);
        this.set('isComponentDecommissionAvailable', this.get('isStart'));
        break;
      case "DECOMMISSIONING":
        this.set('isComponentRecommissionAvailable', true);
        this.set('isComponentDecommissioning', true);
        this.set('isComponentDecommissionAvailable', false);
        break;
      case "DECOMMISSIONED":
        this.set('isComponentRecommissionAvailable', true);
        this.set('isComponentDecommissioning', false);
        this.set('isComponentDecommissionAvailable', false);
        break;
      case "RS_DECOMMISSIONED":
        this.set('isComponentRecommissionAvailable', true);
        this.set('isComponentDecommissioning', this.get('isStart'));
        this.set('isComponentDecommissionAvailable', false);
        break;
    }
  },

  /**
   * Do blinking for 1 minute
   */
  doBlinking: function () {
    var workStatus = this.get('workStatus');
    var self = this;
    var pulsate = [App.HostComponentStatus.starting, App.HostComponentStatus.stopping, App.HostComponentStatus.installing].contains(workStatus);
    if (!pulsate) {
      var component = this.get('content');
      if (component && workStatus != "INSTALLED") {
        pulsate = this.get('isDecommissioning');
      }
    }
    if (pulsate && !self.get('isBlinking')) {
      self.set('isBlinking', true);
      uiEffects.pulsate(self.$('.components-health'), 1000, function () {
        self.set('isBlinking', false);
        self.doBlinking();
      });
    }
  },

  /**
   * Start blinking when host component is starting/stopping/decommissioning
   */
  startBlinking: function () {
    this.$('.components-health').stop(true, true);
    this.$('.components-health').css({opacity: 1.0});
    this.doBlinking();
  }.observes('workStatus','isComponentRecommissionAvailable', 'isDecommissioning'),

  didInsertElement: function() {
    this._super();
    this.loadComponentDecommissionStatus();
  },

  /**
   * Update Decommission status only one time when component was changed
   */
  updateDecommissionStatus: function() {
    Em.run.once(this, 'loadComponentDecommissionStatus');
  }.observes('content.workStatus', 'content.passiveState'),


  decommissionView: Em.View.extend({

    templateName: require('templates/main/host/decommission'),

    text: function() {
      return this.get('parentView.isComponentDecommissionAvailable') ? Em.I18n.t('common.decommission') : Em.I18n.t('common.recommission');
    }.property('parentView.isComponentDecommissionAvailable'),

    didInsertElement: function() {
      this._super();
      App.tooltip($("[rel='decommissionTooltip']"));
    },

    click: function() {
      if (!this.get('parentView.isComponentDecommissionDisable')) {
        if (this.get('parentView.isComponentDecommissionAvailable')) {
          this.get('controller').decommission(this.get('parentView.content'));
        } else {
          this.get('controller').recommission(this.get('parentView.content'));
        }
      }
    }
  })
});
