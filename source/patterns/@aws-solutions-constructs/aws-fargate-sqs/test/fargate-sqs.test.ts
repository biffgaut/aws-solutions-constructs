/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

import '@aws-cdk/assert/jest';
import * as defaults from '@aws-solutions-constructs/core';
import * as cdk from "@aws-cdk/core";
import { FargateToSqs } from "../lib";
import * as sqs from '@aws-cdk/aws-sqs';
import * as ecs from '@aws-cdk/aws-ecs';

test('New service/new queue, dlq, public API, new VPC', () => {

  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack();
  const publicApi = true;
  const clusterName = "custom-cluster-name";
  const containerName = "custom-container-name";
  const serviceName = "custom-service-name";
  const queueName = "custom-queue-name";
  const familyName = "family-name";
  const deadLetterQueueName = "dlqQueue";

  const construct = new FargateToSqs(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { cidr: '172.0.0.0/16' },
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    queueProps: { queueName },
    deadLetterQueueProps: {
      queueName: deadLetterQueueName
    },
    queuePermissions: ['Read', 'Write']
  });

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    LaunchType: 'FARGATE',
    DesiredCount: 2,
    DeploymentConfiguration: {
      MaximumPercent: 150,
      MinimumHealthyPercent: 75
    },
    PlatformVersion: ecs.FargatePlatformVersion.LATEST,
  });

  expect(construct.vpc !== null);
  expect(construct.service !== null);
  expect(construct.container !== null);
  expect(construct.sqsQueue !== null);
  expect(construct.deadLetterQueue !== null);

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    ServiceName: serviceName
  });
  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
    Family: familyName
  });

  expect(stack).toHaveResourceLike("AWS::ECS::Cluster", {
    ClusterName: clusterName
  });

  expect(stack).toHaveResourceLike("AWS::SQS::Queue", {
    QueueName: queueName
  });

  expect(stack).toHaveResourceLike("AWS::SQS::Queue", {
    QueueName: deadLetterQueueName
  });

  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
        Essential: true,
        Image: {
          "Fn::Join": [
            "",
            [
              "123456789012.dkr.ecr.us-east-1.",
              {
                Ref: "AWS::URLSuffix"
              },
              "/fake-repo:latest"
            ]
          ]
        },
        MemoryReservation: 512,
        Name: containerName,
        PortMappings: [
          {
            ContainerPort: 8080,
            Protocol: "tcp"
          }
        ]
      }
    ]
  });

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.0.0.0/16'
  });

  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "sqs:ReceiveMessage",
            "sqs:ChangeMessageVisibility",
            "sqs:GetQueueUrl",
            "sqs:DeleteMessage",
            "sqs:GetQueueAttributes"
          ],
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "testconstructtestconstructqueue6D12C99B",
              "Arn"
            ]
          }
        },
        {
          Action: [
            "sqs:SendMessage",
            "sqs:GetQueueAttributes",
            "sqs:GetQueueUrl"
          ],
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "testconstructtestconstructqueue6D12C99B",
              "Arn"
            ]
          }
        },
      ],
    }
  });

  // Confirm we created a Public/Private VPC
  expect(stack).toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::SQS::Queue', 2);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});

test('New service/new queue, private API, new VPC', () => {

  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack();
  const publicApi = false;

  new FargateToSqs(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { cidr: '172.0.0.0/16' },
    deployDeadLetterQueue: false,
    queuePermissions: ['Read']
  });

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    LaunchType: 'FARGATE',
    DesiredCount: 2,
    DeploymentConfiguration: {
      MaximumPercent: 150,
      MinimumHealthyPercent: 75
    },
    PlatformVersion: ecs.FargatePlatformVersion.LATEST,
  });

  expect(stack).toHaveResourceLike("AWS::SQS::Queue", {
    KmsMasterKeyId: "alias/aws/sqs"
  });

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.0.0.0/16'
  });

  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "sqs:ReceiveMessage",
            "sqs:ChangeMessageVisibility",
            "sqs:GetQueueUrl",
            "sqs:DeleteMessage",
            "sqs:GetQueueAttributes"
          ],
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "testconstructtestconstructqueue6D12C99B",
              "Arn"
            ]
          }
        }
      ],
    }
  });

  // Confirm we created an Isolated VPC
  expect(stack).not.toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::SQS::Queue', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});

test('New service/existing fifo queue, private API, existing VPC', () => {
  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack();
  const publicApi = false;
  const queueName = 'custom-queue-name.fifo';

  const existingVpc = defaults.getTestVpc(stack, publicApi);

  const existingQueue = new sqs.Queue(stack, 'MyQueue', {
    queueName,
    fifo: true
  });

  new FargateToSqs(stack, 'test-construct', {
    publicApi,
    existingVpc,
    existingQueueObj: existingQueue,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
  });

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    LaunchType: 'FARGATE',
    DesiredCount: 2,
    DeploymentConfiguration: {
      MaximumPercent: 150,
      MinimumHealthyPercent: 75
    },
    PlatformVersion: ecs.FargatePlatformVersion.LATEST,
  });

  expect(stack).toHaveResourceLike("AWS::SQS::Queue", {
    QueueName: queueName,
    FifoQueue: true
  });

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "sqs:SendMessage",
            "sqs:GetQueueAttributes",
            "sqs:GetQueueUrl"
          ],
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "MyQueueE6CA6235",
              "Arn"
            ]
          }
        },
      ],
    }
  });

  // Confirm we created an Isolated VPC
  expect(stack).not.toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::SQS::Queue', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});

test('Existing service/new queue, public API, existing VPC', () => {
  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack();
  const publicApi = true;
  const serviceName = 'custom-name';
  const customVariableName = 'CUSTOM_NAME';
  const customArnName = 'CUSTOM_ARN_NAME';
  const queueName = 'testQueue';
  const dlqName = 'dlqQueue';

  const existingVpc = defaults.getTestVpc(stack);

  const [testService, testContainer] = defaults.CreateFargateService(stack,
    'test',
    existingVpc,
    undefined,
    defaults.fakeEcrRepoArn,
    undefined,
    undefined,
    undefined,
    { serviceName });

  new FargateToSqs(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: testService,
    existingContainerDefinitionObject: testContainer,
    existingVpc,
    queueUrlEnvironmentVariableName: customVariableName,
    queueArnEnvironmentVariableName: customArnName,
    queueProps: {
      queueName
    },
    deadLetterQueueProps: {
      queueName: dlqName
    }
  });

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    ServiceName: serviceName
  });

  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: customArnName,
            Value: {
              "Fn::GetAtt": [
                "testconstructtestconstructqueue6D12C99B",
                "Arn"
              ]
            }
          },
          {
            Name: customVariableName,
            Value: {
              Ref: "testconstructtestconstructqueue6D12C99B"
            }
          },
        ],
        Essential: true,
        Image: {
          "Fn::Join": [
            "",
            [
              "123456789012.dkr.ecr.us-east-1.",
              {
                Ref: "AWS::URLSuffix"
              },
              "/fake-repo:latest"
            ]
          ]
        },
        MemoryReservation: 512,
        Name: "test-container",
        PortMappings: [
          {
            ContainerPort: 8080,
            Protocol: "tcp"
          }
        ]
      }
    ]
  });
  expect(stack).toHaveResourceLike("AWS::SQS::Queue", {
    QueueName: queueName
  });

  expect(stack).toHaveResourceLike("AWS::SQS::Queue", {
    QueueName: dlqName
  });

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  // Confirm we created a Public/Private VPC
  expect(stack).toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::SQS::Queue', 2);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});

// Test existing service/existing queue, private API, new VPC
test('Existing service/existing queue, private API, existing VPC', () => {
  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack();
  const publicApi = false;
  const serviceName = 'custom-name';
  const queueName = 'custom-queue-name';

  const existingVpc = defaults.getTestVpc(stack, publicApi);

  const [testService, testContainer] = defaults.CreateFargateService(stack,
    'test',
    existingVpc,
    undefined,
    defaults.fakeEcrRepoArn,
    undefined,
    undefined,
    undefined,
    { serviceName });

  const existingQueue = new sqs.Queue(stack, 'MyQueue', {
    queueName
  });

  new FargateToSqs(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: testService,
    existingContainerDefinitionObject: testContainer,
    existingVpc,
    existingQueueObj: existingQueue
  });

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    ServiceName: serviceName,
  });

  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: "SQS_QUEUE_ARN",
            Value: {
              "Fn::GetAtt": [
                "MyQueueE6CA6235",
                "Arn"
              ]
            }
          },
          {
            Name: "SQS_QUEUE_URL",
            Value: {
              Ref: "MyQueueE6CA6235"
            }
          }
        ],
        Essential: true,
        Image: {
          "Fn::Join": [
            "",
            [
              "123456789012.dkr.ecr.us-east-1.",
              {
                Ref: "AWS::URLSuffix"
              },
              "/fake-repo:latest"
            ]
          ]
        },
        MemoryReservation: 512,
        Name: "test-container",
        PortMappings: [
          {
            ContainerPort: 8080,
            Protocol: "tcp"
          }
        ]
      }
    ]
  });

  expect(stack).toHaveResourceLike("AWS::SQS::Queue", {
    QueueName: queueName
  });
  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  // Confirm we created an Isolated VPC
  expect(stack).not.toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::SQS::Queue', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});

test('Test bad queuePermissions', () => {

  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack();
  const publicApi = false;

  const props = {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { cidr: '172.0.0.0/16' },
    deployDeadLetterQueue: false,
    queuePermissions: ['Reed'],
  };

  const app = () => {
    new FargateToSqs(stack, 'test-construct', props);
  };

  expect(app).toThrowError('Invalid queue permission submitted - Reed');
});
