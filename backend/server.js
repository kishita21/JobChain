const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const grpc = require('@grpc/grpc-js');
const { connect, signers } = require('@hyperledger/fabric-gateway');

const app = express();
app.use(cors());
app.use(express.json());

const TEST_NETWORK = path.resolve(
  process.env.HOME,
  'blockchain-projects/fabric-samples/test-network'
);

const ORG_PATH = path.join(
  TEST_NETWORK,
  'organizations/peerOrganizations/org1.example.com'
);

const CERT_PATH = path.join(
  ORG_PATH,
  'users/User1@org1.example.com/msp/signcerts/User1@org1.example.com-cert.pem'
);

const KEY_DIR = path.join(
  ORG_PATH,
  'users/User1@org1.example.com/msp/keystore'
);

const TLS_PATH = path.join(
  ORG_PATH,
  'peers/peer0.org1.example.com/tls/ca.crt'
);

async function getContract() {
  const certificate = fs.readFileSync(CERT_PATH);
  const privateKeyFile = fs.readdirSync(KEY_DIR)[0];
  const privateKey = require('crypto').createPrivateKey(fs.readFileSync(path.join(KEY_DIR, privateKeyFile)));
  const tlsCertificate = fs.readFileSync(TLS_PATH);

  const client = new grpc.Client(
    'localhost:7051',
    grpc.credentials.createSsl(tlsCertificate),
    {
      'grpc.ssl_target_name_override': 'peer0.org1.example.com',
      'grpc.default_authority': 'peer0.org1.example.com'
    }
  );

  const gateway = connect({
    client,
    identity: {
      mspId: 'Org1MSP',
      credentials: certificate
    },
    signer: signers.newPrivateKeySigner(privateKey)
  });

  const network = gateway.getNetwork('mychannel');
  const contract = network.getContract('jobmarket');

  return { gateway, client, contract };
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'JobChain backend running' });
});

app.get('/api/jobs', async (req, res) => {
  let connection;
  try {
    connection = await getContract();
    const result = await connection.contract.evaluateTransaction('GetAllJobs');
    res.json(JSON.parse(Buffer.from(result).toString() || '[]'));
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) {
      connection.gateway.close();
      connection.client.close();
    }
  }
});

app.post('/api/jobs', async (req, res) => {
  let connection;
  try {
    const { jobId, title, company, location, salary, description } = req.body;

    if (!jobId || !title || !company || !location || !salary || !description) {
      return res.status(400).json({ error: 'All job fields are required' });
    }

    connection = await getContract();

    const result = await connection.contract.submitTransaction(
      'CreateJob',
      jobId,
      title,
      company,
      location,
      String(salary),
      description
    );

    res.json({
      success: true,
      message: 'Job created on Hyperledger Fabric',
      result: Buffer.from(result).toString()
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) {
      connection.gateway.close();
      connection.client.close();
    }
  }
});

app.post('/api/jobs/:jobId/apply', async (req, res) => {
  let connection;
  try {
    const { applicationId, applicantName, email, skills } = req.body;

    if (!applicationId || !applicantName || !email || !skills) {
      return res.status(400).json({ error: 'All applicant fields are required' });
    }

    connection = await getContract();

    const result = await connection.contract.submitTransaction(
      'ApplyForJob',
      req.params.jobId,
      applicationId,
      applicantName,
      email,
      skills
    );

    res.json({
      success: true,
      message: 'Application recorded on Hyperledger Fabric',
      result: Buffer.from(result).toString()
    });
  } catch (error) {
    console.error('Apply error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) {
      connection.gateway.close();
      connection.client.close();
    }
  }
});

app.get('/api/jobs/:jobId/applications', async (req, res) => {
  let connection;
  try {
    connection = await getContract();

    const result = await connection.contract.evaluateTransaction(
      'GetApplications',
      req.params.jobId
    );

    res.json(JSON.parse(Buffer.from(result).toString() || '[]'));
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) {
      connection.gateway.close();
      connection.client.close();
    }
  }
});

app.listen(4000, () => {
  console.log('JobChain backend running at http://localhost:4000');
});
