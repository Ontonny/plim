run:
	cargo run
run_dev:
	cargo run -- -l 0.0.0.0:3001
copy_static:
	rm -rf ./static/* && cp -r ./plim_front/dist/* ./static/
build_static:
	export VITE_PLIM_BACKEND_URL=https://production.host:3000/api/v1 && cd ./plim_front && npm run build
build_static_dev:
	export VITE_PLIM_BACKEND_URL=http://localhost:3001/api/v1 && cd ./plim_front && npm run build 
run_full:
	just build_static
	just copy_static
	just run
run_full_dev:
	just build_static_dev
	just copy_static
	just run_dev
build_release:
	cargo build --release
npm_build:
	cd ./plim_front && npm install && npm run build
docker_build:
	docker build -t plim-rusty .
etcd_migrations:
	bash -c "cd etcd_migrations && sh run.sh"
front_run_dev:
	export VITE_PLIM_BACKEND_URL=http://localhost:3001/api/v1 && cd ./plim_front && npm run dev
test:
	cargo test
test_front:
	cd ./plim_front && npm test
test_all:
	just test && just test_front
test_watch:
	cargo test --watch
test_front_watch:
	cd ./plim_front && npm test -- --watch
lint:
	cargo clippy -- -W clippy::pedantic -W clippy::nursery -W clippy::cargo
lint_front:
	cd ./plim_front && npm run lint
lint_all:
	just lint && just lint_front
fmt:
	cargo fmt
fmt_check:
	cargo fmt --check
fmt_front:
	cd ./plim_front && npm run lint -- --fix
fmt_all:
	just fmt && just fmt_front