import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class GeminiCheck {
    public static void main(String[] args) {
        String apiKey = "AIzaSyDKHhVCEfhtHMnMEVHVanfg7skS2PFK5D4";
        try {
            System.out.println("Checking Gemini API connection...");
            URL url = new URL("https://generativelanguage.googleapis.com/v1beta/models?key=" + apiKey);
            HttpURLConnection con = (HttpURLConnection) url.openConnection();
            con.setRequestMethod("GET");

            int status = con.getResponseCode();
            System.out.println("Status Code: " + status);

            BufferedReader in = new BufferedReader(new InputStreamReader(
                status >= 400 ? con.getErrorStream() : con.getInputStream()));
            String inputLine;
            StringBuilder content = new StringBuilder();
            while ((inputLine = in.readLine()) != null) {
                content.append(inputLine);
            }
            in.close();

            System.out.println("Response body: " + content.toString());
            
            if (status == 200) {
                System.out.println("\nSUCCESS! Your API key is working.");
                if (content.toString().contains("gemini-1.5-flash")) {
                    System.out.println("Model 'gemini-1.5-flash' IS available.");
                } else {
                    System.out.println("Model 'gemini-1.5-flash' is NOT in your list. Check available models above.");
                }
            } else {
                System.out.println("\nFAILED! Check if your API key is correct or if you have billing enabled.");
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
