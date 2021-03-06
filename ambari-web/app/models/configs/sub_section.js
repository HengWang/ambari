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

App.SubSection = DS.Model.extend({
  id: DS.attr('string'),
  name: DS.attr('string'),
  displayName: DS.attr('string'),
  border: DS.attr('boolean', {defaultValue: false}),
  rowIndex: DS.attr('number', {defaultValue: 1}),
  columnIndex: DS.attr('number', {defaultValue: 1}),
  rowSpan: DS.attr('number', {defaultValue: 1}),
  columnSpan: DS.attr('number', {defaultValue: 1}),
  section: DS.belongsTo('App.Section'),
  configProperties: DS.hasMany('App.StackConfigProperty'),
  configs: [],

  /**
   * Number of the errors in all configs
   * @type {number}
   */
  errorsCount: function () {
    return this.get('configs').filterProperty('isValid', false).length;
  }.property('configs.@each.isValid'),

  isFirstRow: function () {
    return this.get('rowIndex') == 0;
  }.property(),

  isMiddleRow: function () {
    return this.get('rowIndex') != 0 && (this.get('rowIndex') + this.get('rowSpan') < this.get('section.sectionRows'));
  }.property(),

  isLastRow: function () {
    return this.get('rowIndex') + this.get('rowSpan') == this.get('section.sectionRows');
  }.property(),

  isFirstColumn: function () {
    return this.get('columnIndex') == 0;
  }.property(),

  isMiddleColumn: function () {
    return this.get('columnIndex') != 0 && (this.get('columnIndex') + this.get('columnSpan') < this.get('section.sectionColumns'));
  }.property(),

  isLastColumn: function () {
    return this.get('columnIndex') + this.get('columnSpan') == this.get('section.sectionColumns');
  }.property()
});


App.SubSection.FIXTURES = [];

