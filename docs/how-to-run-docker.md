docker run -p 12399:3000 `
>>   --env-file .env.docker.local `
>>   -v "E:\Workspace\MyHomeApp\data\data:/app/data" `
>>   -v "E:\Workspace\MyHomeApp\data\config:/app/config" `
>>   -v "E:\Workspace\MyHomeApp\data\logs:/app/logs" `
>>   --name myhomeapp-test `
>>   myhomeapp-test


docker run -p 12351:3001 `
  --env-file .env.local `
  -v "E:\Workspace\MyHomeApp\data\data:/app/data" `
  -v "E:\Workspace\MyHomeApp\data\config:/app/config" `
  -v "E:\Workspace\MyHomeApp\data\logs:/app/logs" `
  --name myhomeapp-test-3 `
  myhomeapp-anime