package com.example.demo.Service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.internet.MimeMessage;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

@Service
public class EmailService {

    private static final Logger logger = LogManager.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    public void sendVerificationEmail(String toEmail, String code) {
        // Log the code immediately for quick console-based manual testing
        logger.info("========================================");
        logger.info("VERIFICATION CODE FOR {}: {}", toEmail, code);
        logger.info("========================================");
        System.out.println("VERIFICATION CODE FOR " + toEmail + " IS: " + code);

        if (mailSender == null) {
            logger.warn("JavaMailSender is not configured. Code is printed in console.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(toEmail);
            helper.setSubject("Connectify - Password Reset Verification Code");

            String htmlContent = "<div style=\"font-family: 'Outfit', 'Segoe UI', sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px; border-radius: 16px; max-width: 500px; margin: 0 auto; border: 1px solid #1e293b;\">"
                    + "  <div style=\"text-align: center; margin-bottom: 20px;\">"
                    + "    <h2 style=\"color: #6366f1; margin: 0; font-size: 26px;\">Connectify</h2>"
                    + "    <p style=\"color: #94a3b8; font-size: 14px; margin-top: 4px;\">Password Reset Request</p>"
                    + "  </div>"
                    + "  <div style=\"background-color: #1e293b; padding: 24px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.05);\">"
                    + "    <p style=\"font-size: 16px; margin: 0 0 16px 0; color: #cbd5e1;\">Use the verification code below to reset your password. It will expire in 5 minutes.</p>"
                    + "    <div style=\"font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #a855f7; padding: 12px; background-color: #0f172a; border-radius: 8px; display: inline-block; border: 1px solid rgba(99, 102, 241, 0.3);\">"
                    + code + "</div>"
                    + "  </div>"
                    + "  <p style=\"font-size: 12px; color: #64748b; text-align: center; margin-top: 24px;\">If you did not request this, please ignore this email.</p>"
                    + "</div>";

            helper.setText(htmlContent, true);
            mailSender.send(message);
            logger.info("Verification email sent successfully to {}", toEmail);
        } catch (Exception e) {
            logger.error("Failed to send email to {}: {}", toEmail, e.getMessage());
        }
    }
}

