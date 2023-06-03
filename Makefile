## env for project
PROJECT_NAME := climate-warehouse
APP_NAME := climate-warehouse
VERSION := `node -p "require('./package.json').version"`

## env for docker
REGISTRY := 647051440173.dkr.ecr.us-east-2.amazonaws.com
IMAGE_NAME := $(REGISTRY)/$(APP_NAME)

## env for helm
HELM_REPO_NAME := hashgreen
HELM_REPO_URL := s3://hashgreen-helm-charts/charts

## common
.PHONY: help
help: ## show help
	@grep -hE '^[ a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-17s\033[0m %s\n", $$1, $$2}'

.PHONY: version
version: ## show version
	@echo $(VERSION)

.PHONY: clean
clean: ## clean artifacts
	@rm -rf ./deployments/charts/*.tgz
	@echo Successfully removed artifacts

## docker
.PHONY: build-image
build-image: ## build docker image
	@docker build -t $(IMAGE_NAME):$(VERSION) .

.PHONY: push-image
push-image: ## push docker image to ecr
	@docker push $(IMAGE_NAME):$(VERSION)

## helm
.PHONY: lint-helm
lint-helm: ## lint helm chart
	@helm lint deployments/charts/*

.PHONY: add-helm-repo
add-helm-repo: ## add helm repo
	@helm repo add --no-update $(HELM_REPO_NAME) $(HELM_REPO_URL)
	@helm repo update $(HELM_REPO_NAME)

.PHONY: package-helm
package-helm: clean ## package helm chart
	@helm package -u ./deployments/charts/* --destination ./deployments/charts

.PHONY: push-helm
push-helm: ## push helm chart to gcs
	@for file in $(wildcard ./deployments/charts/*.tgz); do \
		helm s3 push --force $$file $(HELM_REPO_NAME); \
	done
	@helm repo update $(HELM_REPO_NAME)
