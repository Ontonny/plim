
# plim-rusty - **PL**an **I**nfostructure **M**anagement for your needs

```bash
cargo install cargo-watch
```

### Etcd usage manual

```bash

# create new key
etcdctl put /test/key '["one", "two", "three"]'
etcdctl put /test/key2 '["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]'
etcdctl put /test/key3 '["version: 1.0.0"]'

# get key
etcdctl get /test/key

# delete key
etcdctl del /test/key
```

### Run app

```bash
target/debug/plim-rusty
TOKEN_SECRET="your secret" TEST__TOKEN=123456789012 ADMIN__GL__TOKEN="glpat-7LeqjJtrgRB5ek4sa_zj" cargo run
```

```bash
TOKEN_SECRET="your secret" ADMIN__GL__TOKEN="glpat-WJ87s6r8y2rfexNpkyNN" target/debug/plim-rusty

```

### Start local production environment
0) set desired VITE_PLIM_BACKEND_URL variable to ip address you are using to avoid CORS or use same for test -> export VITE_PLIM_BACKEND_URL=https://localhost:3000/api/v1
1) build with command `docker-compose build`
2) create gitlab token in your profile User Settings -> Access tokens and put it in variable for later use forexample ADMIN_GL_TOKEN
3) in main config `config.yml` set gitlab -> api_endpoint for your EP api url
4) TOKEN_SECRET enviroment variable used for JWT ecryption recommend to change
5) after all set to start use command `docker-compose up`
6) our url will be accessed on https://production.host:3001 address or desired from p0, don't lose `https` JWT won't work.
7) default login password admin\test, you can change it from menu later using hash from `Genpass` menu
8) your newly created plans should use token with propper rights from p2

