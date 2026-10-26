FROM public.ecr.aws/lambda/nodejs:20

# Set working directory
WORKDIR ${LAMBDA_TASK_ROOT}

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy source files
COPY telemetry.js index.js ./

# Set the Lambda handler
CMD [ "index.handler" ]
