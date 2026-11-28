const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { frontend, loader } = require('./helpers.cjs');

test('the primary cluster keeps SuperAdmin requests on the configured console API', async () => {
  const consoleApi = 'https://superadminapi.example.test';
  const primary = {
    cluster_id: 'cluster_a',
    status: 'active',
    school_db: { backend_url: 'https://simsapi.example.test' },
  };
  const secondary = {
    cluster_id: 'cluster_b',
    status: 'active',
    school_db: { backend_url: 'https://cluster-b.example.test' },
  };
  const routes = [];
  const load = loader({
    '@react-native-async-storage/async-storage': {
      getItem: async () => primary.cluster_id,
      setItem: async () => {},
    },
    [path.join(frontend, 'src/config/clusters.ts')]: {
      CLUSTERS: [{ ...primary, school_db: { backend_url: consoleApi } }],
    },
    [path.join(frontend, 'src/services/clusterConfigService.ts')]: {
      loadClusters: async () => [primary, secondary],
    },
    [path.join(frontend, 'src/api/superAdminClient.ts')]: {
      setGlobalBackendUrl: (url) => routes.push(url),
    },
    [path.join(frontend, 'src/api/tokens.ts')]: {
      clearTokens: async () => {},
      setTokenClusterPrefix: () => {},
    },
  });
  const { ClusterProvider, useCluster } = load(path.join(frontend, 'src/contexts/ClusterContext.tsx'));
  let cluster;
  let tree;
  function CaptureCluster() {
    cluster = useCluster();
    return null;
  }

  await act(async () => {
    tree = create(React.createElement(ClusterProvider, null, React.createElement(CaptureCluster)));
  });
  try {
    assert.equal(cluster.isClusterReady, true);
    assert.equal(cluster.selectedCluster, primary);
    assert.deepEqual(routes, [consoleApi]);

    await act(() => cluster.setSelectedCluster(secondary));
    await act(() => cluster.setSelectedCluster(primary));
    assert.deepEqual(routes, [consoleApi, secondary.school_db.backend_url, consoleApi]);
  } finally {
    act(() => tree.unmount());
  }
});
