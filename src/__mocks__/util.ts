const transporter: any = jest.genMockFromModule("..");

// add required fields
transporter.sendMail = jest.fn();

export { transporter };
