/*
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

import java.util.List;

import javax.persistence.Basic;
import javax.persistence.CollectionTable;
import javax.persistence.Column;
import javax.persistence.ElementCollection;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.JoinTable;
import javax.persistence.ManyToMany;
import javax.persistence.ManyToOne;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.OneToOne;
import javax.persistence.Table;
import javax.persistence.TableGenerator;

@Entity
@Table(name = "serviceconfig")
@TableGenerator(name = "service_config_id_generator",
  table = "ambari_sequences", pkColumnName = "sequence_name", valueColumnName = "sequence_value"
  , pkColumnValue = "service_config_id_seq"
  , initialValue = 1
  , allocationSize = 1
)
@NamedQueries({ @NamedQuery(name = "ServiceConfigEntity.findNextServiceConfigVersion", query = "SELECT COALESCE(MAX(serviceConfig.version), 0) + 1 AS nextVersion FROM ServiceConfigEntity serviceConfig WHERE serviceConfig.serviceName=:serviceName AND serviceConfig.clusterId=:clusterId") })
public class ServiceConfigEntity {
  @Id
  @Column(name = "service_config_id")
  @GeneratedValue(strategy = GenerationType.TABLE, generator = "service_config_id_generator")
  private Long serviceConfigId;

  @Basic
  @Column(name = "cluster_id", insertable = false, updatable = false, nullable = false)
  private Long clusterId;

  @Basic
  @Column(name = "service_name", nullable = false)
  private String serviceName;

  @Basic
  @Column(name = "group_id", nullable = true)
  private Long groupId;

  @Basic
  @Column(name = "version", nullable = false)
  private Long version;

  @Basic
  @Column(name = "create_timestamp", nullable = false)
  private Long createTimestamp = System.currentTimeMillis();

  @Basic
  @Column(name = "user_name")
  private String user = "_db";

  @Basic
  @Column(name = "note")
  private String note;

  @ElementCollection()
  @CollectionTable(name = "serviceconfighosts", joinColumns = {@JoinColumn(name = "service_config_id")})
  @Column(name = "hostname")
  private List<String> hostNames;

  @ManyToMany
  @JoinTable(
    name = "serviceconfigmapping",
    joinColumns = {@JoinColumn(name = "service_config_id", referencedColumnName = "service_config_id")},
    inverseJoinColumns = {@JoinColumn(name = "config_id", referencedColumnName = "config_id")}
  )
  private List<ClusterConfigEntity> clusterConfigEntities;

  @ManyToOne
  @JoinColumn(name = "cluster_id", referencedColumnName = "cluster_id", nullable = false)
  private ClusterEntity clusterEntity;

  /**
   * Unidirectional one-to-one association to {@link StackEntity}
   */
  @OneToOne
  @JoinColumn(name = "stack_id", unique = false, nullable = false, insertable = true, updatable = true)
  private StackEntity stack;

  public Long getServiceConfigId() {
    return serviceConfigId;
  }

  public void setServiceConfigId(Long serviceConfigId) {
    this.serviceConfigId = serviceConfigId;
  }

  public String getServiceName() {
    return serviceName;
  }

  public void setServiceName(String serviceName) {
    this.serviceName = serviceName;
  }

  public Long getVersion() {
    return version;
  }

  public void setVersion(Long version) {
    this.version = version;
  }

  public Long getCreateTimestamp() {
    return createTimestamp;
  }

  public void setCreateTimestamp(Long create_timestamp) {
    createTimestamp = create_timestamp;
  }

  public List<ClusterConfigEntity> getClusterConfigEntities() {
    return clusterConfigEntities;
  }

  public void setClusterConfigEntities(List<ClusterConfigEntity> clusterConfigEntities) {
    this.clusterConfigEntities = clusterConfigEntities;
  }

  public Long getClusterId() {
    return clusterId;
  }

  public void setClusterId(Long clusterId) {
    this.clusterId = clusterId;
  }

  public ClusterEntity getClusterEntity() {
    return clusterEntity;
  }

  public void setClusterEntity(ClusterEntity clusterEntity) {
    this.clusterEntity = clusterEntity;
  }

  public String getUser() {
    return user;
  }

  public void setUser(String user) {
    this.user = user;
  }

  public String getNote() {
    return note;
  }

  public void setNote(String note) {
    this.note = note;
  }

  public Long getGroupId() {
    return groupId;
  }

  public void setGroupId(Long groupId) {
    this.groupId = groupId;
  }

  public List<String> getHostNames() {
    return hostNames;
  }

  public void setHostNames(List<String> hostNames) {
    this.hostNames = hostNames;
  }

  /**
   * Gets the service configuration's stack.
   *
   * @return the stack.
   */
  public StackEntity getStack() {
    return stack;
  }

  /**
   * Sets the service configuration's stack.
   *
   * @param stack
   *          the stack to set for the service configuration (not {@code null}).
   */
  public void setStack(StackEntity stack) {
    this.stack = stack;
  }
}
