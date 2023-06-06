## env for project
PROJECT_NAME := ivern2
APP_NAME := climate-warehouse
VERSION := `node -p "require('./package.json').version"`

## env for docker
REGISTRY := 647051440173.dkr.ecr.us-east-2.amazonaws.com
IMAGE_NAME := $(REGISTRY)/$(APP_NAME)

## env for helm
HELM_REPO_NAME := hashgreen
HELM_REPO_URL := s3://hashgreen-helm-charts/charts
CHART_NAME := climate-warehouse

## env for k8s
DEPLOY_TO := uat
NS := $(DEPLOY_TO)-$(PROJECT_NAME)
RELEASE_NAME := $(DEPLOY_TO)-$(APP_NAME)

## common
.PHONY: help
help: ## show help
	@grep -hE '^[ a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-17s\033[0m %s\n", $$1, $$2}'

.POHNY: continue_if_y
continue_if_y: ## continue if input is y
	@read -p "Do you want to continue? [y/n]: " input; \
	if [ "$$input" = "y" ]; then \
		echo "Continuing..."; \
	else \
		echo "Exiting..."; \
		exit 1; \
	fi

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
	@echo "Building docker image... $(IMAGE_NAME):$(VERSION)"
	@docker build -t $(IMAGE_NAME):$(VERSION) .

.PHONY: push-image
push-image: ## push docker image to ecr
	@echo "Pushing docker image... $(IMAGE_NAME):$(VERSION)"
	@docker push $(IMAGE_NAME):$(VERSION)

## helm
.PHONY: add-helm-repo
add-helm-repo: ## add helm repo
	@helm repo add --no-update $(HELM_REPO_NAME) $(HELM_REPO_URL)
	@helm repo update $(HELM_REPO_NAME)

.PHONY: upgrade-helm
upgrade-helm: ## upgrade helm chart
	@echo "Upgrading $(RELEASE_NAME) to $(VERSION) using $(HELM_REPO_NAME)/$(CHART_NAME) in $(NS)"
	@echo "Using values.yaml in ./deployments/configs/$(DEPLOY_TO)/$(APP_NAME)/values.yaml"

	$(MAKE) continue_if_y

	@helm upgrade $(RELEASE_NAME) $(HELM_REPO_NAME)/$(CHART_NAME) \
	--install --namespace $(NS) \
	--history-max 3 \
	--values ./deployments/configs/$(DEPLOY_TO)/$(APP_NAME)/values.yaml \
	--set image.tag=$(VERSION)

## deployment
.PHONY: deploy-uat
deploy-uat: ## deploy to uat
	@npm version prerelease --preid=dev
	@version=`npm pkg get version | xargs echo` && \
	echo "Deploying version $$version to uat"

	@git push && git push --tags

.PHONY: deploy-uat-upgrade
deploy-uat-upgrade: ## deploy to uat
	@npm version preminor --preid=dev
	@version=`npm pkg get version | xargs echo` && \
	echo "Deploying version $$version to uat"

	@git push && git push --tags

.PHONY: deploy-stg
deploy-stg: ## deploy to stg
	@npm version patch
	@version=`npm pkg get version | xargs echo` && \
	echo "Deploying version $$version to stg"

	@git push && git push --tags
