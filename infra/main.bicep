// TicketFly · one environment (dev | stg | prod). Same file, three parameter sets — environments cannot drift.
targetScope = 'resourceGroup'

@allowed(['dev', 'stg', 'prod'])
param env string
param location string = resourceGroup().location
param image string
param appVersion string
param gitSha string = 'local'
param postgresSku string = env == 'prod' ? 'Standard_B2s' : 'Standard_B1ms'
param minReplicas int = env == 'prod' ? 1 : 0

var name = 'tf-${env}'
var tags = { app: 'ticketfly', env: env, version: appVersion }

resource law 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${name}-law'
  location: location
  tags: tags
  properties: { sku: { name: 'PerGB2018' }, retentionInDays: env == 'prod' ? 90 : 30 }
}

resource vnet 'Microsoft.Network/virtualNetworks@2023-11-01' = {
  name: '${name}-vnet'
  location: location
  tags: tags
  properties: {
    addressSpace: { addressPrefixes: ['10.40.0.0/16'] }
    subnets: [
      { name: 'aca', properties: { addressPrefix: '10.40.0.0/23', delegations: [{ name: 'aca', properties: { serviceName: 'Microsoft.App/environments' } }] } }
      { name: 'pe', properties: { addressPrefix: '10.40.2.0/24' } }
    ]
  }
}

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${name}-kv'
  location: location
  tags: tags
  properties: {
    tenantId: subscription().tenantId
    sku: { family: 'A', name: 'standard' }
    enableRbacAuthorization: true
    publicNetworkAccess: 'Disabled'
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: replace('${name}sa', '-', '')
  location: location
  tags: tags
  sku: { name: env == 'prod' ? 'Standard_GRS' : 'Standard_LRS' }
  kind: 'StorageV2'
  properties: { allowBlobPublicAccess: false, minimumTlsVersion: 'TLS1_2', publicNetworkAccess: 'Disabled' }
}

resource pg 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: '${name}-pg'
  location: location
  tags: tags
  sku: { name: postgresSku, tier: 'Burstable' }
  properties: {
    version: '16'
    storage: { storageSizeGB: env == 'prod' ? 128 : 32 }
    backup: { backupRetentionDays: env == 'prod' ? 35 : 7, geoRedundantBackup: env == 'prod' ? 'Enabled' : 'Disabled' }
    authConfig: { activeDirectoryAuth: 'Enabled', passwordAuth: 'Disabled', tenantId: subscription().tenantId }
    network: { publicNetworkAccess: 'Disabled' }
  }
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${name}-id'
  location: location
  tags: tags
}

resource acaEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${name}-env'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: { destination: 'log-analytics', logAnalyticsConfiguration: { customerId: law.properties.customerId, sharedKey: law.listKeys().primarySharedKey } }
    vnetConfiguration: { infrastructureSubnetId: vnet.properties.subnets[0].id, internal: env == 'prod' }
    workloadProfiles: [{ name: 'Consumption', workloadProfileType: 'Consumption' }]
  }
}

var commonEnv = [
  { name: 'APP_ENV', value: env }
  { name: 'APP_VERSION', value: appVersion }
  { name: 'GIT_SHA', value: gitSha }
  { name: 'DATABASE_URL', value: 'postgres://${identity.name}@${pg.name}.postgres.database.azure.com:5432/ticketfly?sslmode=require' }
  { name: 'AZURE_CLIENT_ID', value: identity.properties.clientId }
  { name: 'STORAGE_ACCOUNT', value: storage.name }
  { name: 'KEY_VAULT_URL', value: kv.properties.vaultUri }
]

resource web 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${name}-web'
  location: location
  tags: tags
  identity: { type: 'UserAssigned', userAssignedIdentities: { '${identity.id}': {} } }
  properties: {
    managedEnvironmentId: acaEnv.id
    configuration: {
      ingress: { external: true, targetPort: 3000, transport: 'http', allowInsecure: false }
      registries: [{ server: 'acrticketfly.azurecr.io', identity: identity.id }]
    }
    template: {
      containers: [{ name: 'web', image: image, resources: { cpu: json('1.0'), memory: '2Gi' }, env: commonEnv, probes: [{ type: 'Liveness', httpGet: { path: '/api/version', port: 3000 } }] }]
      scale: { minReplicas: minReplicas, maxReplicas: env == 'prod' ? 3 : 1 }
    }
  }
}

resource worker 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${name}-worker'
  location: location
  tags: tags
  identity: { type: 'UserAssigned', userAssignedIdentities: { '${identity.id}': {} } }
  properties: {
    managedEnvironmentId: acaEnv.id
    configuration: { registries: [{ server: 'acrticketfly.azurecr.io', identity: identity.id }] }
    template: {
      containers: [{ name: 'worker', image: image, command: ['/nodejs/bin/node', 'apps/worker/dist/main.js'], resources: { cpu: json('0.5'), memory: '1Gi' }, env: commonEnv }]
      scale: { minReplicas: minReplicas, maxReplicas: 1 }
    }
  }
}

output webFqdn string = web.properties.configuration.ingress.fqdn
