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
require('utils/config');

App.Service = DS.Model.extend({

  serviceName: DS.attr('string'),

  workStatus: DS.attr('string'),
  rand: DS.attr('string'),
  alerts: DS.hasMany('App.Alert'),
  quickLinks: DS.hasMany('App.QuickLinks'),
  hostComponents: DS.hasMany('App.HostComponent'),
  serviceConfigsTemplate: App.config.get('preDefinedServiceConfigs'),
  runningHostComponents: null,

  // Instead of making healthStatus a computed property that listens on hostComponents.@each.workStatus,
  // we are creating a separate observer _updateHealthStatus.  This is so that healthStatus is updated
  // only once after the run loop.  This is because Ember invokes the computed property every time
  // a property that it depends on changes.  For example, App.statusMapper's map function would invoke
  // the computed property too many times and freezes the UI without this hack.
  // See http://stackoverflow.com/questions/12467345/ember-js-collapsing-deferring-expensive-observers-or-computed-properties
  healthStatus: '',

  /**
   * Every time when changes workStatus of any component we schedule recalculating values related from them
   */
  _updateHealthStatus: (function() {
    Ember.run.once(this, 'updateStatusDependencies');
  }).observes('hostComponents.@each.workStatus'),

  isStopped: false,
  isStarted: false,

  /**
   * compute service properties which depend on host components status
   * service computed properties:
   *    healthStatus
   *    isStarted
   *    runningHostComponents
   *    unknownHostComponents
   *    isStopped
   */
  updateStatusDependencies: function () {
    var everyStarted = true,
      everyStartedOrMaintenance = true,
      masterComponents = [],
      isStarted = false,
      isUnknown = false,
      isStarting = false,
      isStopped = false,
      isHbaseActive = false,
      serviceName = this.get('serviceName'),
      isRunning = true,
      runningHCs = [],
      unknownHCs = [];

    //look through all components to find out common statuses
    this.get('hostComponents').forEach(function (_hostComponent) {
      if (_hostComponent.get('isMaster')) {
        everyStartedOrMaintenance = (everyStartedOrMaintenance)
          ? ([App.HostComponentStatus.started, App.HostComponentStatus.maintenance].contains(_hostComponent.get('workStatus')))
          : false;
        everyStarted = (everyStarted)
          ? (_hostComponent.get('workStatus') === App.HostComponentStatus.started)
          : false;
        isStarted = (!isStarted)
          ? (_hostComponent.get('workStatus') === App.HostComponentStatus.started)
          : true;
        isUnknown = (!isUnknown)
          ? (_hostComponent.get('workStatus') === App.HostComponentStatus.unknown)
          : true;
        isStarting = (!isStarting)
          ? (_hostComponent.get('workStatus') === App.HostComponentStatus.starting)
          : true;
        isStopped = (!isStopped)
          ? (_hostComponent.get('workStatus') === App.HostComponentStatus.stopped)
          : true;
        isHbaseActive = (!isHbaseActive)
          ? (_hostComponent.get('haStatus') === 'active')
          : true;

        masterComponents.push(_hostComponent);
      }

      if (_hostComponent.get('workStatus') !== App.HostComponentStatus.stopped &&
        _hostComponent.get('workStatus') !== App.HostComponentStatus.install_failed &&
        _hostComponent.get('workStatus') !== App.HostComponentStatus.unknown &&
        _hostComponent.get('workStatus') !== App.HostComponentStatus.maintenance) {
        isRunning = false;
        runningHCs.addObject(_hostComponent);
      } else if (_hostComponent.get('workStatus') == App.HostComponentStatus.unknown) {
        unknownHCs.addObject(_hostComponent);
      }
    }, this);

    //computation of service health status
    var isGreen = serviceName === 'HBASE' && App.supports.multipleHBaseMasters ? isStarted : everyStartedOrMaintenance;
    if (isGreen) {
      this.set('healthStatus', 'green');
    } else if (isUnknown) {
      this.set('healthStatus', 'yellow');
    } else if (isStarting) {
      this.set('healthStatus', 'green-blinking');
    } else if (isStopped) {
      this.set('healthStatus', 'red');
    } else {
      this.set('healthStatus', 'red-blinking');
    }

    if (serviceName === 'HBASE' && App.supports.multipleHBaseMasters) {
      if (!isHbaseActive) {
        this.set('healthStatus', 'red');
      }
    }

    /**
     * Both App.HDFSService and its parent (App.Service) can hit this block.
     * We need a property: App.HDFSService.hdfsHealthStatus to store the correct status.
     * When App.HDFSService get in, we store the status in that property based on if activeNN existed.
     * When App.Service get in, we get correct health status from that property.
     */
    if (isGreen && serviceName === 'HDFS' && masterComponents.length == 5) { // enabled HA
      var activeNN = this.get('activeNameNode');
      var nameNode = this.get('nameNode');
      if (nameNode && !activeNN) { //hdfs model but no active NN
        App.HDFSService.hdfsHealthStatus = 'red';
      } else if (nameNode && activeNN) {
        App.HDFSService.hdfsHealthStatus = 'green';
      }
      this.set('healthStatus', App.HDFSService.hdfsHealthStatus);
    }

    this.set('isStarted', everyStarted);
    this.set('runningHostComponents', runningHCs);
    this.set('unknownHostComponents', unknownHCs);
    this.set('isStopped', isRunning);
  },

  isConfigurable: function () {
    var configurableServices = [
      "HDFS",
      "YARN",
      "MAPREDUCE",
      "MAPREDUCE2",
      "HBASE",
      "OOZIE",
      "HIVE",
      "WEBHCAT",
      "ZOOKEEPER",
      "PIG",
      "SQOOP",
      "NAGIOS",
      "HUE"
    ];
    return configurableServices.contains(this.get('serviceName'));
  }.property('serviceName'),

  displayName: function () {
    switch (this.get('serviceName').toLowerCase()) {
      case 'hdfs':
        return 'HDFS';
      case 'yarn':
        return 'YARN';
      case 'mapreduce':
        return 'MapReduce';
      case 'mapreduce2':
        return 'MapReduce2';
      case 'tez':
        return 'Tez';
      case 'hbase':
        return 'HBase';
      case 'oozie':
        return 'Oozie';
      case 'hive':
        return 'Hive';
      case 'hcatalog':
        return 'HCat';
      case 'zookeeper':
        return 'ZooKeeper';
      case 'pig':
        return 'Pig';
      case 'sqoop':
        return 'Sqoop';
      case 'webhcat':
        return 'WebHCat';
      case 'ganglia':
        return 'Ganglia';
      case 'nagios':
        return 'Nagios';
      case 'hue':
        return 'Hue';
      case 'flume':
        return 'Flume';
    }
    return this.get('serviceName');
  }.property('serviceName'),
  
  /**
   * For each host-component, if the desired_configs dont match the
   * actual_configs, then a restart is required. Except for Global site
   * properties, which need to be checked with map.
   */
  isRestartRequired: function () {
    var restartRequired = false;
    var restartRequiredHostsAndComponents = {};
    var clusterDesiredConfigs = App.router.get('mainServiceController.cluster.desiredConfigs');
    var serviceTemplate = this.serviceConfigsTemplate.findProperty('serviceName', this.get('serviceName'));
    if (clusterDesiredConfigs != null && serviceTemplate!=null) {
      var clusterToDesiredMap = {};
      clusterDesiredConfigs.forEach(function (config) {
        clusterToDesiredMap[config.site] = config;
      });
      this.get('hostComponents').forEach(function(hostComponent){
        var host = hostComponent.get('host');
        var hostName = host.get('hostName');
        hostComponent.get('actualConfigs').forEach(function(config){
          if(serviceTemplate.sites.contains(config.site)){
            var desiredClusterTag = clusterToDesiredMap[config.site].tag;
            var desiredHostOverrideTag = clusterToDesiredMap[config.site].hostOverrides[hostName];
            var actualClusterTag = config.tag;
            var actualHostOverrideTag = config.hostOverrides[hostName];
            var siteRestartRequired = false;
            if(actualClusterTag !== desiredClusterTag || actualHostOverrideTag !== desiredHostOverrideTag){
              var publicHostName = host.get('publicHostName');
              if(config.site=='global'){
                var serviceName = hostComponent.get('service.serviceName');
                if(actualClusterTag !== desiredClusterTag){
                  siteRestartRequired = App.config.isServiceEffectedByGlobalChange(serviceName, actualClusterTag, desiredClusterTag);
                }
                if(actualHostOverrideTag !== desiredHostOverrideTag){
                  siteRestartRequired = App.config.isServiceEffectedByGlobalChange(serviceName, actualHostOverrideTag, desiredHostOverrideTag);
                }
              }else{
                siteRestartRequired = true
              }
              if(siteRestartRequired){
                restartRequired = true;
                if(!(publicHostName in restartRequiredHostsAndComponents)){
                  restartRequiredHostsAndComponents[publicHostName] = [];
                }
                var hostComponentName = hostComponent.get('displayName');
                if(restartRequiredHostsAndComponents[publicHostName].indexOf(hostComponentName)<0){
                  restartRequiredHostsAndComponents[publicHostName].push(hostComponentName);
                }
              }
            }
          }
        });
      });
    }
    this.set('restartRequiredHostsAndComponents', restartRequiredHostsAndComponents);
    return restartRequired;
  }.property('serviceName', 'hostComponents', 'hostComponents.@each.actualConfigs', 'hostComponents.@each.actualConfigs.@each.tag', 
      'App.router.mainServiceController.cluster.desiredConfigs', 'App.router.mainServiceController.cluster.desiredConfigs.@each.tag'),
  
  /**
   * Contains a map of which hosts and host_components
   * need a restart. This is populated when calculating
   * #isRestartRequired()
   * Example:
   * {
   *  'publicHostName1': ['TaskTracker'],
   *  'publicHostName2': ['JobTracker', 'TaskTracker']
   * }
   */
  restartRequiredHostsAndComponents: {},
  
  /**
   * Based on the information in #restartRequiredHostsAndComponents
   */
  restartRequiredMessage: function () {
    var restartHC = this.get('restartRequiredHostsAndComponents');
    var hostCount = 0;
    var hcCount = 0;
    var hostsMsg = "<ul>";
    for(var host in restartHC){
      hostCount++;
      hostsMsg += "<li>"+host+"</li><ul>";
      restartHC[host].forEach(function(c){
        hcCount++;
        hostsMsg += "<li>"+c+"</li>";       
      })
      hostsMsg += "</ul>";
    }
    hostsMsg += "</ul>"
    return this.t('services.service.config.restartService.TooltipMessage').format(hcCount, hostCount, hostsMsg);
  }.property('restartRequiredHostsAndComponents')
});

App.Service.Health = {
  live: "LIVE",
  dead: "DEAD-RED",
  starting: "STARTING",
  stopping: "STOPPING",
  unknown: "DEAD-YELLOW",

  getKeyName: function (value) {
    switch (value) {
      case this.live:
        return 'live';
      case this.dead:
        return 'dead';
      case this.starting:
        return 'starting';
      case this.stopping:
        return 'stopping';
      case this.unknown:
        return 'unknown';
    }
    return 'none';
  }
};

App.Service.FIXTURES = [];
