export const typeDefs = /* GraphQL */ `type AggregateUser {
  count: Int!
}

type BatchPayload {
  count: Long!
}

scalar Long

type Mutation {
  createUser(data: UserCreateInput!): User!
  updateUser(data: UserUpdateInput!, where: UserWhereUniqueInput!): User
  updateManyUsers(data: UserUpdateManyMutationInput!, where: UserWhereInput): BatchPayload!
  upsertUser(where: UserWhereUniqueInput!, create: UserCreateInput!, update: UserUpdateInput!): User!
  deleteUser(where: UserWhereUniqueInput!): User
  deleteManyUsers(where: UserWhereInput): BatchPayload!
}

enum MutationType {
  CREATED
  UPDATED
  DELETED
}

interface Node {
  id: ID!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type Query {
  user(where: UserWhereUniqueInput!): User
  users(where: UserWhereInput, orderBy: UserOrderByInput, skip: Int, after: String, before: String, first: Int, last: Int): [User]!
  usersConnection(where: UserWhereInput, orderBy: UserOrderByInput, skip: Int, after: String, before: String, first: Int, last: Int): UserConnection!
  node(id: ID!): Node
}

enum Role {
  ADMIN
}

type Subscription {
  user(where: UserSubscriptionWhereInput): UserSubscriptionPayload
}

type User {
  id: ID!
  familyName: String!
  givenName: String!
  username: String!
  email: String!
  affiliation: String!
  password: String!
  roles: [Role!]!
}

type UserConnection {
  pageInfo: PageInfo!
  edges: [UserEdge]!
  aggregate: AggregateUser!
}

input UserCreateInput {
  familyName: String!
  givenName: String!
  username: String!
  email: String!
  affiliation: String!
  password: String!
  roles: UserCreaterolesInput
}

input UserCreaterolesInput {
  set: [Role!]
}

type UserEdge {
  node: User!
  cursor: String!
}

enum UserOrderByInput {
  id_ASC
  id_DESC
  familyName_ASC
  familyName_DESC
  givenName_ASC
  givenName_DESC
  username_ASC
  username_DESC
  email_ASC
  email_DESC
  affiliation_ASC
  affiliation_DESC
  password_ASC
  password_DESC
  createdAt_ASC
  createdAt_DESC
  updatedAt_ASC
  updatedAt_DESC
}

type UserPreviousValues {
  id: ID!
  familyName: String!
  givenName: String!
  username: String!
  email: String!
  affiliation: String!
  password: String!
  roles: [Role!]!
}

type UserSubscriptionPayload {
  mutation: MutationType!
  node: User
  updatedFields: [String!]
  previousValues: UserPreviousValues
}

input UserSubscriptionWhereInput {
  mutation_in: [MutationType!]
  updatedFields_contains: String
  updatedFields_contains_every: [String!]
  updatedFields_contains_some: [String!]
  node: UserWhereInput
  AND: [UserSubscriptionWhereInput!]
  OR: [UserSubscriptionWhereInput!]
  NOT: [UserSubscriptionWhereInput!]
}

input UserUpdateInput {
  familyName: String
  givenName: String
  username: String
  email: String
  affiliation: String
  password: String
  roles: UserUpdaterolesInput
}

input UserUpdateManyMutationInput {
  familyName: String
  givenName: String
  username: String
  email: String
  affiliation: String
  password: String
  roles: UserUpdaterolesInput
}

input UserUpdaterolesInput {
  set: [Role!]
}

input UserWhereInput {
  id: ID
  id_not: ID
  id_in: [ID!]
  id_not_in: [ID!]
  id_lt: ID
  id_lte: ID
  id_gt: ID
  id_gte: ID
  id_contains: ID
  id_not_contains: ID
  id_starts_with: ID
  id_not_starts_with: ID
  id_ends_with: ID
  id_not_ends_with: ID
  familyName: String
  familyName_not: String
  familyName_in: [String!]
  familyName_not_in: [String!]
  familyName_lt: String
  familyName_lte: String
  familyName_gt: String
  familyName_gte: String
  familyName_contains: String
  familyName_not_contains: String
  familyName_starts_with: String
  familyName_not_starts_with: String
  familyName_ends_with: String
  familyName_not_ends_with: String
  givenName: String
  givenName_not: String
  givenName_in: [String!]
  givenName_not_in: [String!]
  givenName_lt: String
  givenName_lte: String
  givenName_gt: String
  givenName_gte: String
  givenName_contains: String
  givenName_not_contains: String
  givenName_starts_with: String
  givenName_not_starts_with: String
  givenName_ends_with: String
  givenName_not_ends_with: String
  username: String
  username_not: String
  username_in: [String!]
  username_not_in: [String!]
  username_lt: String
  username_lte: String
  username_gt: String
  username_gte: String
  username_contains: String
  username_not_contains: String
  username_starts_with: String
  username_not_starts_with: String
  username_ends_with: String
  username_not_ends_with: String
  email: String
  email_not: String
  email_in: [String!]
  email_not_in: [String!]
  email_lt: String
  email_lte: String
  email_gt: String
  email_gte: String
  email_contains: String
  email_not_contains: String
  email_starts_with: String
  email_not_starts_with: String
  email_ends_with: String
  email_not_ends_with: String
  affiliation: String
  affiliation_not: String
  affiliation_in: [String!]
  affiliation_not_in: [String!]
  affiliation_lt: String
  affiliation_lte: String
  affiliation_gt: String
  affiliation_gte: String
  affiliation_contains: String
  affiliation_not_contains: String
  affiliation_starts_with: String
  affiliation_not_starts_with: String
  affiliation_ends_with: String
  affiliation_not_ends_with: String
  password: String
  password_not: String
  password_in: [String!]
  password_not_in: [String!]
  password_lt: String
  password_lte: String
  password_gt: String
  password_gte: String
  password_contains: String
  password_not_contains: String
  password_starts_with: String
  password_not_starts_with: String
  password_ends_with: String
  password_not_ends_with: String
  AND: [UserWhereInput!]
  OR: [UserWhereInput!]
  NOT: [UserWhereInput!]
}

input UserWhereUniqueInput {
  id: ID
  username: String
  email: String
}
`