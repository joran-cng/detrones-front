import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Input from '../Input.vue'

describe('Input.vue', () => {
  it('renders label and placeholder correctly', () => {
    const wrapper = mount(Input, {
      props: {
        label: 'Username',
        placeholder: 'Enter username',
      },
    })
    
    // Check label text
    expect(wrapper.find('label').text()).toContain('Username')
    
    // Check input placeholder
    const input = wrapper.find('input')
    expect(input.attributes('placeholder')).toBe('Enter username')
  })

  it('emits update:modelValue event when typing', async () => {
    const wrapper = mount(Input, {
      props: {
        label: 'Username',
        modelValue: '',
      },
    })
    
    const input = wrapper.find('input')
    await input.setValue('john_doe')
    
    // Check emitted events
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['john_doe'])
  })

  it('renders error message and replaces hint when error is provided', () => {
    const wrapper = mount(Input, {
      props: {
        label: 'Email',
        hint: 'We will not share your email',
        error: 'Invalid email address',
      },
    })
    
    // Check error text is visible
    expect(wrapper.text()).toContain('Invalid email address')
    
    // Check hint text is NOT visible (since error is shown)
    expect(wrapper.text()).not.toContain('We will not share your email')
  })

  it('toggles password visibility when toggle button is clicked', async () => {
    const wrapper = mount(Input, {
      props: {
        label: 'Password',
        type: 'password',
      },
    })
    
    const input = wrapper.find('input')
    expect(input.attributes('type')).toBe('password')
    
    // Find the password toggle button
    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    
    // Click button to show password
    await button.trigger('click')
    expect(input.attributes('type')).toBe('text')
    
    // Click again to hide password
    await button.trigger('click')
    expect(input.attributes('type')).toBe('password')
  })
})
