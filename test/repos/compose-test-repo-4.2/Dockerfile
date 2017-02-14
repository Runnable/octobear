FROM node:latest

ENV IS_MIRRORED_DOCKERFILE 1

COPY ["./package.json", "/app/"]
WORKDIR /app
RUN npm install # runnable-cache

COPY ["./", "/app/"]

# Open up ports on the container
EXPOSE 80 8000 8080 3000

# Command to start the app
CMD npm start
