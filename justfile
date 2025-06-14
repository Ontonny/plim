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