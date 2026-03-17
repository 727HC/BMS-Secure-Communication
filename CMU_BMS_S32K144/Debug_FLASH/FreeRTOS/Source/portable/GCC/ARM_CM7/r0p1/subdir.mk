C_SRCS += ../FreeRTOS/Source/portable/GCC/ARM_CM7/r0p1/port.c
OBJS += ./FreeRTOS/Source/portable/GCC/ARM_CM7/r0p1/port.o
C_DEPS += ./FreeRTOS/Source/portable/GCC/ARM_CM7/r0p1/port.d

FreeRTOS/Source/portable/GCC/ARM_CM7/r0p1/%.o: ../FreeRTOS/Source/portable/GCC/ARM_CM7/r0p1/%.c
	@echo 'Building file: $<'
	arm-none-eabi-gcc "@FreeRTOS/Source/freertos.args" -MMD -MP -MF"$(@:%.o=%.d)" -MT"$@" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '
