import java.util.Properties;
import javax.mail.*;
import javax.mail.internet.*;

public class TestEmail {
    public static void main(String[] args) {
        String to = "suriyasricse@gmail.com";
        String from = "suriyasricse@gmail.com";
        final String username = "suriyasricse@gmail.com";
        final String password = "jpzngiroyjyuarcz";

        Properties props = new Properties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.host", "smtp.gmail.com");
        props.put("mail.smtp.port", "587");

        Session session = Session.getInstance(props,
          new javax.mail.Authenticator() {
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(username, password);
            }
          });

        try {
            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(from));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(to));
            message.setSubject("Test Email - Direct Java");
            message.setText("This is a direct test email from Java.");
            Transport.send(message);
            System.out.println("TEST EMAIL SENT SUCCESSFULLY!");
        } catch (MessagingException e) {
            System.out.println("TEST EMAIL FAILED:");
            e.printStackTrace();
        }
    }
}
