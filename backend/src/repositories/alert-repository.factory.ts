import { env } from '../config/env';
import type { IAlertRepository } from './alert.repository.interface';
import { InMemoryAlertRepository } from './in-memory-alert.repository';
import { DynamoDbAlertRepository } from './dynamodb-alert.repository';

let activeRepository: IAlertRepository | null = null;

/**
 * Returns the configured alert repository instance.
 *
 * If ALERT_PERSISTENCE=dynamodb is set (or DYNAMODB_TABLE_NAME is present in AWS),
 * instantiates the DynamoDbAlertRepository. Otherwise, falls back to the
 * InMemoryAlertRepository for rapid local development and testing.
 */
export function getAlertRepository(): IAlertRepository {
  if (activeRepository) {
    return activeRepository;
  }

  if (env.alertPersistence === 'dynamodb') {
    activeRepository = new DynamoDbAlertRepository({
      tableName: env.dynamoDbTableName,
      gsiName: env.dynamoDbGsiName,
      region: env.awsRegion,
    });
  } else {
    activeRepository = new InMemoryAlertRepository();
  }

  return activeRepository;
}

/**
 * Allows test suites to inject custom or mocked repository instances.
 */
export function setAlertRepository(repository: IAlertRepository | null): void {
  activeRepository = repository;
}
