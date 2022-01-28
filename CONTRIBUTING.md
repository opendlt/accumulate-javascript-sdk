# Contributing

When contributing to this repository, please first discuss the change you wish to make via issue,
email, or any other method with the owners of this repository before making a change.

## Tests

- `yarn test` runs unit tests.
- `yarn test-integration` runs integration tests that require to run against a live instance of Accumulate RPC API.
- `yarn test-all` run both unit and integration tests, with code coverage.

Integration tests require a running instance of Accumulate RPC API, by default it will assume one is running locally at `http://127.0.1.1:26660/v2`. The endpoint can be overriden with an environment variable: `ACC_ENDPOINT="https://testnet.accumulatenetwork.io/v2" yarn test-integration`.
