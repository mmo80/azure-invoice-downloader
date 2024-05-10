
const app = {
  tenantId: Bun.env.TENANT,
  clientId: Bun.env.APP_ID,
  clientSecret: Bun.env.PASSWORD,
};

const fileFormatVariables = {
  SHORTNAME: '[[shortname]]', // ex: CPG (witch is short for Company Pay Go)
  DATE: '[[thedate]]', // formatted as 2024-01 (year-month), change below if you want other date format in the filename
  INVOICENAME: '[[invoicename]]', // its the invoice billing number set by azure. ex. G123456789
} as const;

const fileFormat = `Azure-${fileFormatVariables.SHORTNAME}-invoice-YOUR-COMPANY-${fileFormatVariables.DATE}--${fileFormatVariables.INVOICENAME}`; // <-- CHANGE!

/*
Info:
billingAccountName (%3A = :)
********-****-****-****-************%3A********-****-****-****-************_2019-05-31
*/
const billingAccountName = '********-****-****-****-************%3A********-****-****-****-************_2019-05-31'; // <-- CHANGE!

const resource = 'https://management.azure.com/';
const apiVersion = '2020-05-01';
const subscriptions = [
  {
    id: '********-****-****-****-************',
    name: '********** Pay Go',
    shortname: 'PG',
    billingProfileName: '****-****-***-***', // <- ALL CAPITAL LETTERS
  },
  // <-- ADD MULTIPLE SUBSCRIPTIONS!
] as const;

// Specify the time period for the invoices you wish to download.
const periodStartDate = '2023-12-01'; // <-- CHANGE!
const periodEndDate = '2024-04-01'; // <-- CHANGE!


const getAuthToken = async () => {
  try {
    const login_url = `https://login.microsoftonline.com/${app.tenantId}/oauth2/token`;
    const login_body = {
      grant_type: 'client_credentials',
      client_id: app.clientId,
      client_secret: app.clientSecret,
      resource: resource,
    } as const;
    const formBody = Object.keys(login_body)
      // @ts-ignore
      .map((key) => encodeURIComponent(key) + '=' + encodeURIComponent(login_body[key]))
      .join('&');
    const login_response = await fetch(login_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody,
    });
    const auth_data = await login_response.json();
    return auth_data.access_token;
  } catch (error) {
    console.error('Error obtaining auth token:', error);
    throw new Error('Failed to obtain auth token');
  }
};

const downloadInvoice = async (accessToken: string, url: string, filenameFormat: string, subscriptionName: string) => {
  const paramsObj = {
    'api-version': apiVersion,
    periodEndDate: periodEndDate,
    periodStartDate: periodStartDate,
  };
  const searchParams = new URLSearchParams(paramsObj);

  try {
    const response = await fetch(`${url}?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    console.log(`Downloading invoices for ${subscriptionName}...`);

    const invoices = data.value;
    for (const invoice of invoices) {
      const invoice_name = invoice.name;
      const props = invoice.properties;
      const downloadUrl = props.documents[0].url;

      const dueDate = new Date(props.dueDate);
      const stringDate = `${dueDate.getFullYear()}-${(dueDate.getMonth() + 1).toString().padStart(2, '0')}`;

      const response = await fetch(downloadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const headerLocationUrl = response.headers.get('location') ?? '';

      const locationUrlResponse = await fetch(headerLocationUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const locationUrlData = await locationUrlResponse.json();

      const pdfFileResponse = await fetch(locationUrlData.url, {
        method: 'GET',
      });

      const fileExt = '.pdf';
      const filename = filenameFormat
        .replace(fileFormatVariables.DATE, stringDate)
        .replace(fileFormatVariables.INVOICENAME, invoice_name);
      await Bun.write(`./invoices/${filename}${fileExt}`, pdfFileResponse);

      console.log(`Invoice downloaded: ${filename}${fileExt}`);
    }
  } catch (error) {
    console.error('Error downloading invoice:', error);
  }
};

const run = async () => {
  try {
    const accessToken = await getAuthToken();

    subscriptions.forEach(async (s) => {
      const url = `https://management.azure.com/providers/Microsoft.Billing/billingAccounts/${billingAccountName}/billingProfiles/${s.billingProfileName}/invoices`;
      const filenameFormat = fileFormat.replace(fileFormatVariables.SHORTNAME, s.shortname);

      await downloadInvoice(accessToken, url, filenameFormat, s.name);
    });
  } catch (error) {
    console.error('An error occurred:', error);
  }
};

await run();
