import importlib.machinery
import importlib.util
from pathlib import Path
import unittest

loader = importlib.machinery.SourceFileLoader('site_release', str(Path(__file__).with_name('avgst-site-release')))
spec = importlib.util.spec_from_loader(loader.name, loader)
release = importlib.util.module_from_spec(spec)
loader.exec_module(release)


class ReadinessPolicy(unittest.TestCase):
    def response(self, **changes):
        result = {'health': {'status': 'ok', 'commit': 'a' * 40, 'buildId': 'build-a'}, 'ready': {'status': 'ready', 'buildId': 'build-a'}}
        for endpoint, values in changes.items():
            result[endpoint].update(values)
        return result

    def test_ready_contract_does_not_require_commit_on_ready_endpoint(self):
        self.assertTrue(release.matches_readiness(self.response(), 'a' * 40))

    def test_old_running_revision_cannot_pass(self):
        self.assertFalse(release.matches_readiness(self.response(), 'b' * 40))

    def test_mixed_deployment_responses_cannot_pass(self):
        self.assertFalse(release.matches_readiness(self.response(ready={'buildId': 'build-b'}), 'a' * 40))

    def test_missing_identity_and_failed_dependency_cannot_pass(self):
        self.assertFalse(release.matches_readiness(self.response(health={'buildId': None}), 'a' * 40))
        self.assertFalse(release.matches_readiness(self.response(ready={'status': 'not-ready'}), 'a' * 40))


if __name__ == '__main__':
    unittest.main()
