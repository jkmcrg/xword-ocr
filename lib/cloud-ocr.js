export class CloudOCR {
  constructor(settings) {
    this.provider = settings.ocrProvider || 'google';
    this.apiKey = settings.apiKey;
    this.azureEndpoint = settings.azureEndpoint;
    this.awsRegion = settings.awsRegion || 'us-east-1';
    this.awsSecret = settings.awsSecret;
  }

  async recognize(imageBase64) {
    switch (this.provider) {
      case 'google':
        return this.googleVision(imageBase64);
      case 'azure':
        return this.azureComputerVision(imageBase64);
      case 'aws':
        return this.awsTextract(imageBase64);
      default:
        throw new Error(`Unknown OCR provider: ${this.provider}`);
    }
  }

  async googleVision(imageBase64) {
    const base64Content = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64Content },
            features: [{ type: 'TEXT_DETECTION', maxResults: 500 }]
          }]
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Google Vision API error: ${response.status}`);
    }

    const data = await response.json();
    return this.normalizeGoogleResponse(data);
  }

  normalizeGoogleResponse(data) {
    const results = [];
    const annotations = data.responses?.[0]?.textAnnotations;
    
    if (!annotations || annotations.length <= 1) {
      return results;
    }

    for (let i = 1; i < annotations.length; i++) {
      const annotation = annotations[i];
      const text = annotation.description;
      const vertices = annotation.boundingPoly?.vertices || [];
      
      if (text && vertices.length >= 4) {
        const x = (vertices[0].x + vertices[1].x) / 2;
        const y = (vertices[0].y + vertices[2].y) / 2;
        const width = Math.abs(vertices[1].x - vertices[0].x);
        const height = Math.abs(vertices[2].y - vertices[0].y);

        for (const char of text) {
          if (/[A-Za-z]/.test(char)) {
            results.push({
              char: char.toUpperCase(),
              x,
              y,
              width,
              height
            });
          }
        }
      }
    }

    return results;
  }

  async azureComputerVision(imageBase64) {
    if (!this.azureEndpoint) {
      throw new Error('Azure endpoint is required');
    }

    const base64Content = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const binaryData = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));

    const response = await fetch(
      `${this.azureEndpoint}/vision/v3.2/read/analyze`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Ocp-Apim-Subscription-Key': this.apiKey
        },
        body: binaryData
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Azure API error: ${error}`);
    }

    const operationLocation = response.headers.get('Operation-Location');
    if (!operationLocation) {
      throw new Error('Azure did not return operation location');
    }

    return this.pollAzureResult(operationLocation);
  }

  async pollAzureResult(operationLocation) {
    const maxAttempts = 30;
    const delayMs = 1000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, delayMs));

      const response = await fetch(operationLocation, {
        headers: { 'Ocp-Apim-Subscription-Key': this.apiKey }
      });

      if (!response.ok) {
        throw new Error(`Azure polling error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'succeeded') {
        return this.normalizeAzureResponse(data);
      } else if (data.status === 'failed') {
        throw new Error('Azure OCR processing failed');
      }
    }

    throw new Error('Azure OCR timed out');
  }

  normalizeAzureResponse(data) {
    const results = [];
    const readResults = data.analyzeResult?.readResults || [];

    for (const page of readResults) {
      for (const line of page.lines || []) {
        for (const word of line.words || []) {
          const text = word.text;
          const bbox = word.boundingBox;

          if (text && bbox && bbox.length >= 8) {
            const x = (bbox[0] + bbox[2]) / 2;
            const y = (bbox[1] + bbox[5]) / 2;

            for (const char of text) {
              if (/[A-Za-z]/.test(char)) {
                results.push({
                  char: char.toUpperCase(),
                  x,
                  y,
                  width: Math.abs(bbox[2] - bbox[0]),
                  height: Math.abs(bbox[5] - bbox[1])
                });
              }
            }
          }
        }
      }
    }

    return results;
  }

  async awsTextract(imageBase64) {
    const base64Content = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    const host = `textract.${this.awsRegion}.amazonaws.com`;
    const endpoint = `https://${host}`;
    const service = 'textract';
    const method = 'POST';
    const amzTarget = 'Textract.DetectDocumentText';
    
    const payload = JSON.stringify({
      Document: { Bytes: base64Content }
    });

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const headers = {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': amzTarget,
      'X-Amz-Date': amzDate,
      'Host': host
    };

    const authHeader = await this.createAWSAuthHeader(
      method, '/', '', payload, headers, 
      service, this.awsRegion, dateStamp, amzDate
    );
    headers['Authorization'] = authHeader;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: payload
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AWS Textract error: ${error}`);
    }

    const data = await response.json();
    return this.normalizeAWSResponse(data);
  }

  async createAWSAuthHeader(method, uri, queryString, payload, headers, service, region, dateStamp, amzDate) {
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    
    const signedHeaders = Object.keys(headers)
      .map(k => k.toLowerCase())
      .sort()
      .join(';');
    
    const canonicalHeaders = Object.keys(headers)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .map(k => `${k.toLowerCase()}:${headers[k].trim()}`)
      .join('\n') + '\n';

    const payloadHash = await this.sha256(payload);
    
    const canonicalRequest = [
      method, uri, queryString, canonicalHeaders, signedHeaders, payloadHash
    ].join('\n');

    const canonicalRequestHash = await this.sha256(canonicalRequest);
    
    const stringToSign = [
      algorithm, amzDate, credentialScope, canonicalRequestHash
    ].join('\n');

    const signingKey = await this.getAWSSignatureKey(
      this.awsSecret, dateStamp, region, service
    );
    
    const signature = await this.hmacHex(signingKey, stringToSign);

    return `${algorithm} Credential=${this.apiKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  }

  async sha256(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async hmac(key, message) {
    const encoder = new TextEncoder();
    const keyData = typeof key === 'string' ? encoder.encode(key) : key;
    const messageData = encoder.encode(message);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    
    return await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  }

  async hmacHex(key, message) {
    const signature = await this.hmac(key, message);
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async getAWSSignatureKey(key, dateStamp, region, service) {
    const encoder = new TextEncoder();
    const kDate = await this.hmac(encoder.encode('AWS4' + key), dateStamp);
    const kRegion = await this.hmac(new Uint8Array(kDate), region);
    const kService = await this.hmac(new Uint8Array(kRegion), service);
    const kSigning = await this.hmac(new Uint8Array(kService), 'aws4_request');
    return new Uint8Array(kSigning);
  }

  normalizeAWSResponse(data) {
    const results = [];
    const blocks = data.Blocks || [];

    for (const block of blocks) {
      if (block.BlockType === 'WORD' && block.Text) {
        const bbox = block.Geometry?.BoundingBox;
        if (bbox) {
          const x = bbox.Left + bbox.Width / 2;
          const y = bbox.Top + bbox.Height / 2;

          for (const char of block.Text) {
            if (/[A-Za-z]/.test(char)) {
              results.push({
                char: char.toUpperCase(),
                x,
                y,
                width: bbox.Width,
                height: bbox.Height,
                isNormalized: true
              });
            }
          }
        }
      }
    }

    return results;
  }

  static async test(settings) {
    const ocr = new CloudOCR(settings);
    
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    try {
      await ocr.recognize(testImageBase64);
      return { success: true };
    } catch (err) {
      if (err.message.includes('API key') || err.message.includes('401') || err.message.includes('403')) {
        return { success: false, error: 'Invalid API key' };
      }
      return { success: true };
    }
  }
}
