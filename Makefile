.PHONY: php-package-install php-bootstrap herd-bootstrap frontend-install frontend-dev

php-package-install:
	composer install --working-dir=packages/laravel-response-trace

php-bootstrap herd-bootstrap:
	./scripts/bootstrap-laravel-sandbox.sh

frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev
