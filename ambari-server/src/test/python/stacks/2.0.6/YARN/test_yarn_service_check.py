#!/usr/bin/env python

'''
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
'''
import os
from mock.mock import MagicMock, call, patch
from stacks.utils.RMFTestCase import *

@patch("platform.linux_distribution", new = MagicMock(return_value="Linux"))
@patch("sys.executable", new = '/usr/bin/python2.6')
class TestServiceCheck(RMFTestCase):
  COMMON_SERVICES_PACKAGE_DIR = "YARN/2.1.0.2.0/package"
  STACK_VERSION = "2.0.6"

  def test_service_check_default(self):

    self.executeScript(self.COMMON_SERVICES_PACKAGE_DIR + "/scripts/service_check.py",
                          classname="ServiceCheck",
                          command="service_check",
                          config_file="default.json",
                          hdp_stack_version = self.STACK_VERSION,
                          target = RMFTestCase.TARGET_COMMON_SERVICES
    )
    self.assertResourceCalled('Execute', 'yarn org.apache.hadoop.yarn.applications.distributedshell.Client '
                                         '-shell_command ls -jar /usr/lib/hadoop-yarn/hadoop-yarn-applications-distributedshell*.jar',
                          logoutput = True,
                          path = ['/usr/sbin:/sbin:/usr/local/bin:/bin:/usr/bin'],
                          tries = 3,
                          user = 'ambari-qa',
                          try_sleep = 5,
    )
    self.assertNoMoreResources()

  def test_service_check_secured(self):
    self.executeScript(self.COMMON_SERVICES_PACKAGE_DIR + "/scripts/service_check.py",
                          classname="ServiceCheck",
                          command="service_check",
                          config_file="secured.json",
                          hdp_stack_version = self.STACK_VERSION,
                          target = RMFTestCase.TARGET_COMMON_SERVICES
    )
    self.assertResourceCalled('Execute', '/usr/bin/kinit -kt /etc/security/keytabs/smokeuser.headless.keytab '
                                         'ambari-qa@EXAMPLE.COM; yarn org.apache.hadoop.yarn.applications.distributedshell.Client '
                                         '-shell_command ls -jar /usr/lib/hadoop-yarn/hadoop-yarn-applications-distributedshell*.jar',
                          logoutput = True,
                          path = ['/usr/sbin:/sbin:/usr/local/bin:/bin:/usr/bin'],
                          tries = 3,
                          user = 'ambari-qa',
                          try_sleep = 5,
    )
    self.assertNoMoreResources()
