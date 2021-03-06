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

package org.apache.ambari.server.orm.entities;

import static org.easymock.EasyMock.createMock;
import static org.easymock.EasyMock.expect;
import static org.easymock.EasyMock.replay;
import static org.easymock.EasyMock.verify;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertSame;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.apache.ambari.server.api.services.AmbariMetaInfo;
import org.apache.ambari.server.state.PropertyInfo;
import org.apache.ambari.server.state.ServiceInfo;
import org.junit.Before;
import org.junit.Test;

import com.google.gson.Gson;

/**
 * BlueprintEntity unit tests
 */
public class BlueprintEntityTest {

  private StackEntity stackEntity = new StackEntity();

  @Before
  public void setup() {
    stackEntity = new StackEntity();
    stackEntity.setStackName("HDP");
    stackEntity.setStackVersion("2.0.6");
  }

  @Test
  public void testSetGetBlueprintName() {
    BlueprintEntity entity = new BlueprintEntity();
    entity.setBlueprintName("foo");
    assertEquals("foo", entity.getBlueprintName());
  }

  @Test
  public void testSetGetStack() {
    BlueprintEntity entity = new BlueprintEntity();
    entity.setStack(stackEntity);
    assertEquals(stackEntity, entity.getStack());
  }

  @Test
  public void testSetGetHostGroups() {
    BlueprintEntity entity = new BlueprintEntity();
    Collection<HostGroupEntity> hostGroups = Collections.emptyList();
    entity.setHostGroups(hostGroups);
    assertSame(hostGroups, entity.getHostGroups());
  }

  @Test
  public void testSetGetConfigurations() {
    BlueprintEntity entity = new BlueprintEntity();
    Collection<BlueprintConfigEntity> configurations = Collections.emptyList();
    entity.setConfigurations(configurations);
    assertSame(configurations, entity.getConfigurations());
  }

  @Test
  public void testValidateConfigurations_clusterConfig() throws Exception {
    AmbariMetaInfo metaInfo = createMock(AmbariMetaInfo.class);
    ServiceInfo service = new ServiceInfo();
    service.setName("service1");

    List<PropertyInfo> serviceProperties = new ArrayList<PropertyInfo>();

    PropertyInfo prop = new PropertyInfo();
    prop.setFilename("core-site.xml");
    prop.setName("super.secret.password");
    prop.setRequireInput(true);
    Set<PropertyInfo.PropertyType> propertyTypes = new HashSet<PropertyInfo.PropertyType>();
    propertyTypes.add(PropertyInfo.PropertyType.PASSWORD);
    prop.setPropertyTypes(propertyTypes);
    prop.setValue(null);
    serviceProperties.add(prop);
    service.getProperties().addAll(serviceProperties);
    service.getProperties().addAll(serviceProperties);

    BlueprintEntity entity = new BlueprintEntity();
    entity.setStack(stackEntity);

    Collection<BlueprintConfigEntity> configurations = new HashSet<BlueprintConfigEntity>();
    BlueprintConfigEntity configEntity = new BlueprintConfigEntity();
    configEntity.setBlueprintEntity(entity);
    configEntity.setBlueprintName("blueprint");
    configEntity.setType("core-site");

    Map<String, String> configData = new HashMap<String, String>();
    configData.put("foo", "val1");
    configData.put("bar", "val2");
    configData.put("super.secret.password", "password");
    configEntity.setConfigData(new Gson().toJson(configData));

    configurations.add(configEntity);
    entity.setConfigurations(configurations);

    Collection<HostGroupEntity> hostGroupEntities = new HashSet<HostGroupEntity>();
    HostGroupEntity hostGroupEntity = new HostGroupEntity();
    hostGroupEntity.setName("group1");
    Collection<HostGroupComponentEntity> hostGroupComponents = new HashSet<HostGroupComponentEntity>();
    HostGroupComponentEntity componentEntity = new HostGroupComponentEntity();
    componentEntity.setName("component1");
    componentEntity.setBlueprintName("blueprint");
    componentEntity.setHostGroupEntity(hostGroupEntity);
    componentEntity.setHostGroupName("group1");
    hostGroupComponents.add(componentEntity);
    hostGroupEntity.setComponents(hostGroupComponents);
    hostGroupEntity.setConfigurations(Collections.<HostGroupConfigEntity>emptyList());
    hostGroupEntities.add(hostGroupEntity);
    entity.setHostGroups(hostGroupEntities);

    expect(metaInfo.getComponentToService("HDP", "2.0.6", "component1")).andReturn("service1");
    expect(metaInfo.getService("HDP", "2.0.6", "service1")).andReturn(service);

    replay(metaInfo);

    Map<String, Map<String, Collection<String>>> missingProps = entity.validateConfigurations(
        metaInfo, true);

    assertTrue(missingProps.isEmpty());

    verify(metaInfo);
  }

  @Test
  public void testValidateConfigurations_hostGroupConfig() throws Exception {
    AmbariMetaInfo metaInfo = createMock(AmbariMetaInfo.class);
    ServiceInfo service = new ServiceInfo();
    service.setName("service1");

    List<PropertyInfo> serviceProperties = new ArrayList<PropertyInfo>();
    PropertyInfo prop1 = new PropertyInfo();
    prop1.setFilename("core-site.xml");
    prop1.setName("super.secret.password");
    prop1.setRequireInput(true);
    Set<PropertyInfo.PropertyType> propertyTypes = new HashSet<PropertyInfo.PropertyType>();
    propertyTypes.add(PropertyInfo.PropertyType.PASSWORD);
    prop1.setPropertyTypes(propertyTypes);
    prop1.setValue(null);
    serviceProperties.add(prop1);
    service.getProperties().addAll(serviceProperties);

    BlueprintEntity entity = new BlueprintEntity();
    entity.setStack(stackEntity);

    entity.setConfigurations(Collections.<BlueprintConfigEntity>emptyList());

    Collection<HostGroupEntity> hostGroupEntities = new HashSet<HostGroupEntity>();
    HostGroupEntity hostGroupEntity = new HostGroupEntity();
    hostGroupEntity.setName("group1");
    Collection<HostGroupComponentEntity> hostGroupComponents = new HashSet<HostGroupComponentEntity>();
    HostGroupComponentEntity componentEntity = new HostGroupComponentEntity();
    componentEntity.setName("component1");
    componentEntity.setBlueprintName("blueprint");
    componentEntity.setHostGroupEntity(hostGroupEntity);
    componentEntity.setHostGroupName("group1");
    hostGroupComponents.add(componentEntity);
    hostGroupEntity.setComponents(hostGroupComponents);

    Collection<HostGroupConfigEntity> configurations = new HashSet<HostGroupConfigEntity>();
    HostGroupConfigEntity configEntity = new HostGroupConfigEntity();
    configEntity.setHostGroupEntity(hostGroupEntity);
    configEntity.setBlueprintName("blueprint");
    configEntity.setType("core-site");

    Map<String, String> configData = new HashMap<String, String>();
    configData.put("foo", "val1");
    configData.put("bar", "val2");
    configData.put("super.secret.password", "password");
    configEntity.setConfigData(new Gson().toJson(configData));
    configurations.add(configEntity);

    hostGroupEntity.setConfigurations(configurations);
    hostGroupEntities.add(hostGroupEntity);
    entity.setHostGroups(hostGroupEntities);

    expect(metaInfo.getComponentToService("HDP", "2.0.6", "component1")).andReturn("service1");
    expect(metaInfo.getService("HDP", "2.0.6", "service1")).andReturn(service);

    replay(metaInfo);

    Map<String, Map<String, Collection<String>>> missingProps = entity.validateConfigurations(
        metaInfo, true);

    assertTrue(missingProps.isEmpty());

    verify(metaInfo);
  }

  @Test
  public void testValidateConfigurations_negative() throws Exception {
    AmbariMetaInfo metaInfo = createMock(AmbariMetaInfo.class);
    ServiceInfo service = new ServiceInfo();
    service.setName("service1");

    List<PropertyInfo> serviceProperties = new ArrayList<PropertyInfo>();

    PropertyInfo prop1 = new PropertyInfo();
    prop1.setFilename("core-site.xml");
    prop1.setName("super.secret.password");
    prop1.setRequireInput(true);
    Set<PropertyInfo.PropertyType> propertyTypes = new HashSet<PropertyInfo.PropertyType>();
    propertyTypes.add(PropertyInfo.PropertyType.PASSWORD);
    prop1.setPropertyTypes(propertyTypes);
    prop1.setValue(null);
    serviceProperties.add(prop1);

    PropertyInfo prop2 = new PropertyInfo();
    prop2.setFilename("global.xml");
    prop2.setName("another.super.secret.password");
    prop2.setRequireInput(true);
    Set<PropertyInfo.PropertyType> propertyTypes2 = new HashSet<PropertyInfo.PropertyType>();
    propertyTypes2.add(PropertyInfo.PropertyType.PASSWORD);
    prop2.setPropertyTypes(propertyTypes2);
    prop2.setValue(" ");
    serviceProperties.add(prop2);

    service.getProperties().addAll(serviceProperties);

    BlueprintEntity entity = new BlueprintEntity();
    entity.setStack(stackEntity);

    Collection<BlueprintConfigEntity> configurations = new HashSet<BlueprintConfigEntity>();
    BlueprintConfigEntity configEntity = new BlueprintConfigEntity();
    configEntity.setBlueprintEntity(entity);
    configEntity.setBlueprintName("blueprint");
    configEntity.setType("core-site");

    Map<String, String> configData = new HashMap<String, String>();
    configData.put("foo", "val1");
    configData.put("bar", "val2");
    configData.put("some.other.secret.password", "password");
    configEntity.setConfigData(new Gson().toJson(configData));

    configurations.add(configEntity);
    entity.setConfigurations(configurations);

    Collection<HostGroupEntity> hostGroupEntities = new HashSet<HostGroupEntity>();
    HostGroupEntity hostGroupEntity = new HostGroupEntity();
    hostGroupEntity.setName("hg1");
    Collection<HostGroupComponentEntity> hostGroupComponents = new HashSet<HostGroupComponentEntity>();
    HostGroupComponentEntity componentEntity = new HostGroupComponentEntity();
    componentEntity.setName("component1");
    componentEntity.setBlueprintName("blueprint");
    componentEntity.setHostGroupEntity(hostGroupEntity);
    componentEntity.setHostGroupName("hg1");
    hostGroupComponents.add(componentEntity);
    hostGroupEntity.setComponents(hostGroupComponents);
    hostGroupEntity.setConfigurations(Collections.<HostGroupConfigEntity>emptyList());
    hostGroupEntities.add(hostGroupEntity);
    entity.setHostGroups(hostGroupEntities);

    expect(metaInfo.getComponentToService("HDP", "2.0.6", "component1")).andReturn(
        "service1");
    expect(metaInfo.getService("HDP", "2.0.6", "service1")).andReturn(service);

    replay(metaInfo);

    Map<String, Map<String, Collection<String>>> missingProps = entity.validateConfigurations(
        metaInfo, true);

    assertEquals(1, missingProps.size());
    Map<String, Collection<String>> typeProps = missingProps.get("hg1");
    assertEquals(2, typeProps.size());
    assertEquals(1, typeProps.get("global").size());
    assertEquals(1, typeProps.get("core-site").size());

    assertTrue(typeProps.get("core-site").contains("super.secret.password"));
    assertTrue(typeProps.get("global").contains("another.super.secret.password"));

    verify(metaInfo);
  }
}
