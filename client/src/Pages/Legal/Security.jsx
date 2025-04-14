


const Security = () => {
  return (
    <div className="container mx-auto px-4 py-8">

      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Security Policy</h1>
        
        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-700 mb-3">Our Commitment to Security</h2>
            <p className="text-gray-600">
              At Ghar-ko-Sathi, we are committed to ensuring the security of your personal information and providing a safe platform for connecting users with service providers. This security policy outlines the measures we take to protect your data and maintain a secure environment.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-gray-700 mb-3">Data Protection</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>All personal data is encrypted during transmission using industry-standard SSL/TLS protocols.</li>
              <li>We implement secure storage practices with regular security audits.</li>
              <li>Access to user data is strictly limited to authorized personnel only.</li>
              <li>We regularly update our systems to protect against known vulnerabilities.</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-gray-700 mb-3">Account Security</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>We use secure authentication methods to protect user accounts.</li>
              <li>Passwords are stored using strong one-way hashing algorithms.</li>
              <li>We implement measures to prevent unauthorized access attempts.</li>
              <li>Users are encouraged to create strong, unique passwords and not share account credentials.</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-gray-700 mb-3">Service Provider Verification</h2>
            <p className="text-gray-600">
              To ensure the safety of our users, we implement a verification process for service providers that includes:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mt-2">
              <li>Identity verification through official documentation.</li>
              <li>Background checks where applicable and legally permitted.</li>
              <li>Verification of professional qualifications and licenses.</li>
              <li>Regular review of service provider ratings and user feedback.</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-gray-700 mb-3">Payment Security</h2>
            <p className="text-gray-600">
              Our payment processing system is designed with security as a priority:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mt-2">
              <li>We use trusted third-party payment processors that comply with PCI DSS standards.</li>
              <li>Payment information is encrypted and not stored on our servers.</li>
              <li>We implement fraud detection measures to protect against unauthorized transactions.</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-gray-700 mb-3">Reporting Security Issues</h2>
            <p className="text-gray-600">
              If you discover a security vulnerability or have concerns about the security of our platform, please contact us immediately at <span className="text-blue-600">security@gharko-sathi.com</span>. We take all security reports seriously and will investigate promptly.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-gray-700 mb-3">Security Updates</h2>
            <p className="text-gray-600">
              This security policy may be updated periodically to reflect changes in our practices or to address new security challenges. We encourage you to review this policy regularly to stay informed about how we protect your information.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Security;
