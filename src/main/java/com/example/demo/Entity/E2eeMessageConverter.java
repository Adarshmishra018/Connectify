package com.example.demo.Entity;

import com.example.demo.Util.EncryptionUtil;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class E2eeMessageConverter implements AttributeConverter<String, String> {

    @Override
    public String convertToDatabaseColumn(String attribute) {
        // Encrypts the message column value before saving to DB
        return EncryptionUtil.encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        // Decrypts the message column value when retrieving from DB
        return EncryptionUtil.decrypt(dbData);
    }
}
