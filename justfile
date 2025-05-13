run:
	cargo run
copy_static:
	rm -rf ./static/* && cp -r ./plim_front/dist/* ./static/
build_static:
	export VITE_PLIM_BACKEND_URL=https://production.host:3000/api/v1 && cd ./plim_front && npm run build 
run_full:
	just build_static
	just copy_static
	just run
build_release:
	cargo build --release
npm_build:
	cd ./plim_front && npm install && npm run build
docker_build:
	docker build -t plim-rusty .
etcd_migrations:
	bash -c "cd etcd_migrations && sh run.sh"
