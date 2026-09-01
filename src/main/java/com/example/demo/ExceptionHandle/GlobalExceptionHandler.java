package com.example.demo.ExceptionHandle;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice   // <-- this one line is what makes it "global"
public class GlobalExceptionHandler {

    // catches EVERY exception, of every type, from every controller
    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleAnyError(Exception ex) {
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Something went wrong: " + ex.getMessage());
    }
}