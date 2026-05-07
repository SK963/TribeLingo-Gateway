# About the Backend of the Application 
General guidlines / setup Instructions

Use this guide to setup the backend for this project.

It uses postgres , prisma ORM

- Write the complete code for every step. Do not get lazy. Write everything that is needed.
- Your goal is to completely finish the backend setup.
- use of environment variables is  in place of hard coded value in such a way it is compatible for running in k8s (production) , docker-compose(testing) and locally(development) according to the envriroment 
- for every feature like user put the schema validation and related things there like the code structure 


code structure : gateway (features / service based )

```

├── src/                   Node.js Express API
│   ├── modules/
│   │   ├── user/
│   │   ├── auth/
│   │   ├── translation/
│   │   ├── caching/
│   │   └── pos/
│   │   └── db/
│   ├── package.json
│   └── Dockerfile
│   └── app.js    # entrypoint to application

```

# Backend : gateway api
modules 
- users : 
- auth : 
- db :
- caching : 
- pos :  will refere to another backend
- translation : will refer to another backend




## db 
- databases : postgres 
- client : pg (PostgreSQL)
- migration tool : 

or for client&migration
- prisma / typeorm



## user

### Schema stores 
User ID (sub) → Unique, stable Google identifier
Full Name → e.g., "Shubham Kumar"
Email Address → e.g., user@gmail.com
Profile Picture URL



### functionalities
#### creation
-  creation (signup) :  
   -  datails based : full-name + email id + password 
   -  oauth based : signup with google


#### manage 
-  deletetion : deletes the account 
-  updation
   -  updates : name + email-id + password


### Authentication
- login
  - Email + password : (jwt based)
  - Oauth : login with Google 


Recommended Database Schema (Separation of Concerns)

Do not mix password fields and OAuth tokens in the same users table. 
Use a relational structure:Users Table: Stores core user profile information (email, name, global ID).Credentials Table: Stores password hashes (bcrypt, argon2id).LinkedAccounts Table (OAuth): Stores 3rd party IDs, provider names, and OAuth tokens.Schema Examplesql-- Core User Profile
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL, -- Primary email
    created_at TIMESTAMP
);

-- For Password Signups
CREATE TABLE user_credentials (
    user_id UUID REFERENCES users(id),
    password_hash VARCHAR(255) NOT NULL, -- Never plain text
    PRIMARY KEY (user_id)
);

For OAuth Signups
CREATE TABLE linked_accounts (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    provider VARCHAR(50) NOT NULL, -- e.g., 'google', 'github'
    provider_user_id VARCHAR(255) NOT NULL, -- Unique ID from provider
    access_token TEXT,
    refresh_token TEXT,
    UNIQUE(provider, provider_user_id)
);



2. Handling Signup/Login Logic (Account Linking)The primary challenge is preventing duplicate accounts (e.g., user signs up with password, later logs in with Google using the same email).Always use Email as the Anchor: When a user logs in via OAuth, extract their email address from the provider (e.g., Google).Check for Existing Email: Before creating a new user, search the users table for that email.Automatic Linking: If the email exists, link the new OAuth provider (linked_accounts) to the existing user_id.Security Constraint: Only automatically link if the email provider is verified (e.g., Google/Apple verify emails).3. Storing Credentials and Tokens SecurelyPasswords: Use Argon2id or bcrypt to hash passwords. Never store them in plain text.OAuth Tokens: Store access_token and refresh_token encrypted at rest in your database. Use a strong encryption standard like AES.Token Security: Do not store app secrets, access tokens, or refresh tokens in client-side code (mobile apps or frontend JS).4. Key Security ConsiderationsAccount Linking Security: If a user links a social account, allow them to set a password later so they can log in without that social provider.Session Management: Use HttpOnly, Secure, SameSite=Strict cookies for session management to protect against XSS.Data Retention: Provide a clear way for users to delete their account, including linked OAuth accounts.


---


### Buisiness logic :  translation + morphological analyssis 
there are two different services one for translation and one for morphological analysis tagging 
 
direct translation + pos  : just returns the translation and pos tagging 
logged users translation + pos tagging :  saves in translation  in db  not the pos tagging

---


### db 
- use prisma 
- check whether db is up and running 
- schema for the tables required 
- migration with automation 

---

## Caching : History
when a user logged in retrives and stores its history (translation only ) for quick retrival 

Cache Structure:
- Store the history as a Redis List. 
- Key format: `user:history:{userId}`
- Value: Stringified JSON of the translation object.
- Max capacity: Strictly 100 items per user.


Read Logic (When user fetches history):
1. Query Redis using `LRANGE user:history:{userId} 0 99`.
2. If the cache hits (returns data), parse the JSON and return it immediately to the client.
3. If the cache misses (empty or expired):
   - Query PostgreSQL for the latest 100 translations for that `userId`, ordered by `created_at` DESC.
   - Return the data to the client.
   - Asynchronously "warm" the Redis cache by pushing these 100 records into the user's Redis List so the next read is instant.



Write Logic (When a user performs a new translation):
1. Save the new translation record to PostgreSQL.
2. Update the Redis cache:
   - `LPUSH` the new stringified translation object to the front of the `user:history:{userId}` list.
   - Run `LTRIM user:history:{userId} 0 99` to evict the oldest record and ensure the list never exceeds 100 items.
  


---

