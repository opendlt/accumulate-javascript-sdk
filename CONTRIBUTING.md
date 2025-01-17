# Contributing

When contributing to this repository, please first discuss the change you wish to make via issue,
email, or any other method with the owners of this repository before making a change.

## Tests

- `yarn test:unit` runs unit tests.
- `yarn test:integration` runs integration tests that require to run against a live instance of Accumulate RPC API.
- `yarn test:all` run both unit and integration tests, with code coverage.

Integration tests require a running instance of Accumulate RPC API, by default it will assume one is running locally at `http://127.0.1.1:26660/v2`. The endpoint can be overriden with an environment variable: `ACC_ENDPOINT="https://testnet.accumulatenetwork.io/v2" yarn test:integration`.

## Generated Types

The JavaScript implementation of the Accumulate protocol type specification
lives in `src/types`. These types are generated using a Go template. In order to
regenerate these types, you must have Go installed and the submodule cloned.
Cloing with the `--recursive` flag will automatically populate the submodule.
Otherwise, you must run `git submodule init && git submodule update`.

To regenerate the types, run `./types_template/generate.sh`. Alternatively, `cd accumulate` and run each `go run ...` command listed in the script.

To update to a new version of Accumulate, update the submodule and regenerate
the types.
