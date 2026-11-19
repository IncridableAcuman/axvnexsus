package uz.axm.nexus.shared.infrastructure;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.cors.allowed-origins:*}")
    private String allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        var registration = registry.addMapping("/**")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);

        if ("*".equals(allowedOrigins.trim())) {
            registration.allowedOriginPatterns("*");
        } else {
            String[] origins = Arrays.stream(allowedOrigins.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toArray(String[]::new);
            registration.allowedOriginPatterns(origins);
        }
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/static/**")
                .addResourceLocations("classpath:/static/");
    }

    @org.springframework.context.annotation.Bean
    public org.springframework.web.servlet.LocaleResolver localeResolver() {
        var resolver = new org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver();
        resolver.setDefaultLocale(java.util.Locale.forLanguageTag("uz"));
        resolver.setSupportedLocales(java.util.List.of(
                java.util.Locale.forLanguageTag("uz"),
                java.util.Locale.forLanguageTag("ru"),
                java.util.Locale.forLanguageTag("en")
        ));
        return resolver;
    }

    @org.springframework.context.annotation.Bean
    public org.springframework.context.MessageSource messageSource() {
        var messageSource = new org.springframework.context.support.ResourceBundleMessageSource();
        messageSource.setBasenames("messages");
        messageSource.setDefaultEncoding("UTF-8");
        messageSource.setFallbackToSystemLocale(false);
        messageSource.setDefaultLocale(java.util.Locale.forLanguageTag("uz"));
        return messageSource;
    }
}
