C_SRCS += ../FreeRTOS/Source/portable/MemMang/heap_1.c
OBJS += ./FreeRTOS/Source/portable/MemMang/heap_1.o
C_DEPS += ./FreeRTOS/Source/portable/MemMang/heap_1.d

FreeRTOS/Source/portable/MemMang/%.o: ../FreeRTOS/Source/portable/MemMang/%.c
	@echo 'Building file: $<'
	arm-none-eabi-gcc "@FreeRTOS/Source/freertos.args" -MMD -MP -MF"$(@:%.o=%.d)" -MT"$@" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '
