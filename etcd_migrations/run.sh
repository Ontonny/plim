#!/bin/sh
export ETCDCTL_ENDPOINTS="http://etcd:2379"
export ETCDCTL_API=3
cd /etcd_migrations
sleep 2
etcdctl put /test/key '["one", "two", "three"]'
etcdctl put /test/key2 '["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]'
etcdctl put /test/key3 '["version: 1.0.0"]'

etcdctl put /ansible/prod/small "$(cat test_inv.yml)"
etcdctl put /plans/test_plan "$(cat test_plan.yml)"