# aws-apigateway-sqs module
<!--BEGIN STABILITY BANNER-->

---

![Stability: Stable](https://img.shields.io/badge/cfn--resources-stable-success.svg?style=for-the-badge)

---
<!--END STABILITY BANNER-->

| **Reference Documentation**:| <span style="font-weight: normal">https://docs.aws.amazon.com/solutions/latest/constructs/</span>|
|:-------------|:-------------|
<div style="height:8px"></div>

| **Language**     | **Package**        |
|:-------------|-----------------|
|![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png) Python|`aws_solutions_constructs.aws_apigateway_sqs`|
|![Typescript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png) Typescript|`@aws-solutions-constructs/aws-apigateway-sqs`|
|![Java Logo](https://docs.aws.amazon.com/cdk/api/latest/img/java32.png) Java|`software.amazon.awsconstructs.services.apigatewaysqs`|

## Overview

This AWS Solutions Construct implements an Amazon API Gateway connected to an Amazon SQS queue pattern.

Here is a minimal deployable pattern definition:

Typescript
``` typescript
import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';
import { ApiGatewayToSqs, ApiGatewayToSqsProps } from "@aws-solutions-constructs/aws-apigateway-sqs";

new ApiGatewayToSqs(this, 'ApiGatewayToSqsPattern', {});
```

Python
``` python
from aws_solutions_constructs.aws_apigateway_sqs import ApiGatewayToSqs
from aws_cdk import Stack
from constructs import Construct

ApiGatewayToSqs(self, 'ApiGatewayToSqsPattern')
```

Java
``` java
import software.constructs.Construct;

import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awsconstructs.services.apigatewaysqs.*;

new ApiGatewayToSqs(this, "ApiGatewayToSqsPattern", new ApiGatewayToSqsProps.Builder()
        .build());
```

## Pattern Construct Props

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|apiGatewayProps?|[`api.RestApiProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.RestApiProps.html)|Optional user-provided props to override the default props for the API Gateway.|
|queueProps?|[`sqs.QueueProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sqs.QueueProps.html)|Optional user-provided props to override the default props for the queue.|
|deployDeadLetterQueue?|`boolean`|Whether to deploy a secondary queue to be used as a dead letter queue. Defaults to `true`.|
|maxReceiveCount|`number`|The number of times a message can be unsuccessfully dequeued before being moved to the dead-letter queue.|
|allowCreateOperation?|`boolean`|Whether to deploy an API Gateway Method for Create operations on the queue (i.e. sqs:SendMessage).|
|createRequestTemplate?|`string`|Override the default API Gateway Request template for Create method, if allowCreateOperation set to true.|
|allowReadOperation?|`boolean`|Whether to deploy an API Gateway Method for Read operations on the queue (i.e. sqs:ReceiveMessage).|
|readRequestTemplate?|`string`|Override the default API Gateway Request template for Read method, if allowReadOperation set to true.|
|allowDeleteOperation?|`boolean`|Whether to deploy an API Gateway Method for Delete operations on the queue (i.e. sqs:DeleteMessage).|
|deleteRequestTemplate?|`string`|Override the default API Gateway Request template for Delete method, if allowDeleteOperation set to true.|
|logGroupProps?|[`logs.LogGroupProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-logs.LogGroupProps.html)|User provided props to override the default props for for the CloudWatchLogs LogGroup.|

## Pattern Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|apiGateway|[`api.RestApi`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.RestApi.html)|Returns an instance of the API Gateway REST API created by the pattern.|
|apiGatewayRole|[`iam.Role`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-iam.Role.html)|Returns an instance of the iam.Role created by the construct for API Gateway.|
|apiGatewayCloudWatchRole?|[`iam.Role`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-iam.Role.html)|Returns an instance of the iam.Role created by the construct for API Gateway for CloudWatch access.|
|apiGatewayLogGroup|[`logs.LogGroup`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-logs.LogGroup.html)|Returns an instance of the LogGroup created by the construct for API Gateway access logging to CloudWatch.|
|sqsQueue|[`sqs.Queue`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sqs.Queue.html)|Returns an instance of the SQS queue created by the pattern.|
|deadLetterQueue?|[`sqs.DeadLetterQueue`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sqs.DeadLetterQueue.html)|Returns an instance of the DeadLetterQueue created by the pattern.|

## Sample API Usage

| **Method** | **Request Path** | **Request Body** | **Queue Action** | **Description** |
|:-------------|:----------------|-----------------|-----------------|-----------------|
|GET|`/`| |`sqs::ReceiveMessage`|Retrieves a message from the queue.|
|POST|`/`| `{ "data": "Hello World!" }` |`sqs::SendMessage`|Delivers a message to the queue.|
|DELETE|`/message?receiptHandle=[value]`||`sqs::DeleteMessage`|Deletes a specified message from the queue|

## Default settings

Out of the box implementation of the Construct without any override will set the following defaults:

### Amazon API Gateway
* Deploy an edge-optimized API endpoint
* Enable CloudWatch logging for API Gateway
* Configure least privilege access IAM role for API Gateway
* Set the default authorizationType for all API methods to IAM
* Enable X-Ray Tracing

### Amazon SQS Queue
* Deploy SQS dead-letter queue for the source SQS Queue
* Enable server-side encryption for source SQS Queue using AWS Managed KMS Key
* Enforce encryption of data in transit

## Architecture
![Architecture Diagram](architecture.png)

***
&copy; Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.