################################################################################
# Automatically-generated file. Do not edit!
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
C_SRCS += \
../src/main.c \
../src/system_stub.c \
../src/tweetnacl.c

OBJS += \
./src/main.o \
./src/system_stub.o \
./src/tweetnacl.o

C_DEPS += \
./src/main.d \
./src/system_stub.d \
./src/tweetnacl.d


# Each subdirectory must supply rules for building sources it contributes
# TweetNaCl: build with -O2 for ~5-10x speedup on crypto operations
src/tweetnacl.o: ../src/tweetnacl.c
	@echo 'Building file: $< (optimized -O2)'
	@echo 'Invoking: Standard S32DS C Compiler'
	arm-none-eabi-gcc "@src/main.args" -O2 -MMD -MP -MF"$(@:%.o=%.d)" -MT"$@" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '

src/%.o: ../src/%.c
	@echo 'Building file: $<'
	@echo 'Invoking: Standard S32DS C Compiler'
	arm-none-eabi-gcc "@src/main.args" $(CFLAGS_EXTRA) -MMD -MP -MF"$(@:%.o=%.d)" -MT"$@" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '


